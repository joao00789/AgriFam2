import { and, eq, ne } from "drizzle-orm";
import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { db } from "../db/client.js";
import { producers, users } from "../db/schema.js";
import { ApiError } from "../middlewares/errorHandler.js";
import type { ProducerProfileInput } from "../schemas/auth.js";
import { loginSchema, producerProfileSchema, profileUpdateSchema, registerSchema } from "../schemas/auth.js";
import { clearAuthCookie, setAuthCookie } from "../utils/authCookie.js";

const SALT_ROUNDS = 10;
const TOKEN_TTL = "7d";

type UserRow = typeof users.$inferSelect;

const toPublicUser = (user: UserRow) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatarUrl: user.avatarUrl,
});

const signToken = (user: UserRow) =>
  jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET!, {
    expiresIn: TOKEN_TTL,
  });

export const register = async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const { name, email, password, role } = parsed.data;

  // Produtor precisa de um perfil (producers) desde o cadastro: POST /api/produtos
  // exige um producerId, e não existe hoje uma rota separada para criar esse perfil
  // depois. Ver TODO.md Fase 2.
  let producerProfile: ProducerProfileInput | undefined;
  if (role === "producer") {
    const parsedProfile = producerProfileSchema.safeParse(req.body);
    if (!parsedProfile.success) {
      throw new ApiError(400, parsedProfile.error.issues[0]?.message ?? "Dados inválidos.");
    }
    producerProfile = parsedProfile.data;
  }

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) throw new ApiError(409, "Já existe uma conta com este email.");

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const [user] = await db
    .insert(users)
    .values({ name, email, passwordHash, role })
    .returning();

  if (role === "producer" && producerProfile) {
    await db.insert(producers).values({
      userId: user.id,
      property: producerProfile.property,
      location: producerProfile.location,
      specialty: producerProfile.specialty,
      history: producerProfile.history,
      image: producerProfile.image,
    });
  }

  const token = signToken(user);
  setAuthCookie(res, token);
  res.status(201).json({ user: toPublicUser(user) });
};

export const login = async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const { email, password } = parsed.data;

  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) throw new ApiError(401, "Email ou senha inválidos.");

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new ApiError(401, "Email ou senha inválidos.");

  const token = signToken(user);
  setAuthCookie(res, token);
  res.json({ user: toPublicUser(user) });
};

export const logout = (_req: Request, res: Response) => {
  clearAuthCookie(res);
  res.json({ ok: true });
};

export const me = async (req: Request, res: Response) => {
  const user = await db.query.users.findFirst({ where: eq(users.id, req.user!.sub) });
  if (!user) throw new ApiError(401, "Sessão inválida.");
  const producer = user.role === "producer"
    ? await db.query.producers.findFirst({ where: eq(producers.userId, user.id) })
    : undefined;
  res.json({ user: toPublicUser(user), producer: producer ?? null });
};

export const updateMe = async (req: Request, res: Response) => {
  const parsed = profileUpdateSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? "Dados inválidos.");
  const user = await db.query.users.findFirst({ where: eq(users.id, req.user!.sub) });
  if (!user) throw new ApiError(401, "Sessão inválida.");

  const duplicate = await db.query.users.findFirst({
    where: and(eq(users.email, parsed.data.email), ne(users.id, user.id)),
  });
  if (duplicate) throw new ApiError(409, "Este email já está sendo usado por outra conta.");

  if (parsed.data.newPassword) {
    if (!parsed.data.currentPassword || !(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash))) {
      throw new ApiError(400, "A senha atual não confere.");
    }
  }

  const [updated] = await db.update(users).set({
    name: parsed.data.name,
    email: parsed.data.email,
    ...(parsed.data.avatarUrl !== undefined ? { avatarUrl: parsed.data.avatarUrl } : {}),
    ...(parsed.data.newPassword ? { passwordHash: await bcrypt.hash(parsed.data.newPassword, SALT_ROUNDS) } : {}),
  }).where(eq(users.id, user.id)).returning();

  let producer = null;
  if (user.role === "producer") {
    const [updatedProducer] = await db.update(producers).set({
      property: parsed.data.property,
      location: parsed.data.location,
      specialty: parsed.data.specialty,
      history: parsed.data.history,
      image: parsed.data.image,
    }).where(eq(producers.userId, user.id)).returning();
    producer = updatedProducer ?? null;
  }
  res.json({ user: toPublicUser(updated), producer });
};

export const loginWithGoogle = async (req: Request, res: Response) => {
  const accessToken = typeof req.body?.accessToken === "string" ? req.body.accessToken : "";
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) throw new ApiError(503, "Login Google ainda não foi configurado no servidor.");
  if (!accessToken) throw new ApiError(400, "Token Google ausente.");

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new ApiError(401, "Não foi possível validar sua conta Google.");
  const identity = await response.json() as {
    email?: string;
    email_confirmed_at?: string;
    confirmed_at?: string;
    user_metadata?: { full_name?: string; name?: string };
  };
  const email = identity.email?.trim().toLowerCase();
  if (!email || !(identity.email_confirmed_at || identity.confirmed_at)) {
    throw new ApiError(401, "A conta Google precisa ter um email confirmado.");
  }

  let user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) {
    const name = identity.user_metadata?.full_name || identity.user_metadata?.name || email.split("@")[0];
    const passwordHash = await bcrypt.hash(randomBytes(48).toString("hex"), SALT_ROUNDS);
    [user] = await db.insert(users).values({ name, email, passwordHash, role: "buyer" }).returning();
  }
  setAuthCookie(res, signToken(user));
  res.json({ user: toPublicUser(user) });
};

export const startGoogleLogin = (_req: Request, res: Response) => {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) throw new ApiError(503, "Configure SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY em server/.env.");
  const frontendUrl = process.env.FRONTEND_URL || process.env.CORS_ORIGIN || "http://localhost:5173";
  const authorizeUrl = new URL(`${supabaseUrl}/auth/v1/authorize`);
  authorizeUrl.searchParams.set("provider", "google");
  authorizeUrl.searchParams.set("redirect_to", frontendUrl);
  authorizeUrl.searchParams.set("flow_type", "implicit");
  authorizeUrl.searchParams.set("scopes", "openid email profile");
  res.redirect(authorizeUrl.toString());
};
