import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { Router } from "express";
import { db } from "../db/client.js";
import { producers } from "../db/schema.js";
import { ApiError } from "../middlewares/errorHandler.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { createRateLimit } from "../middlewares/rateLimit.js";

export const uploadRouter = Router();
const uploadRateLimit = createRateLimit(20, 15 * 60 * 1000);

uploadRouter.post("/perfil/imagem", uploadRateLimit, requireAuth, async (req, res) => {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "agrifam-images";
  if (!supabaseUrl || !serviceKey) {
    throw new ApiError(503, "Configure SUPABASE_URL e SUPABASE_SECRET_KEY para habilitar uploads.");
  }

  const dataUrl = typeof req.body?.dataUrl === "string" ? req.body.dataUrl : "";
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new ApiError(400, "Envie uma imagem PNG, JPG ou WebP válida.");
  const contentType = match[1];
  const file = Buffer.from(match[2], "base64");
  if (!file.length || file.length > 3 * 1024 * 1024) {
    throw new ApiError(400, "A imagem deve ter no máximo 3 MB.");
  }

  const extension = contentType === "image/jpeg" ? "jpg" : contentType.split("/")[1];
  const path = `${req.user!.sub}/profile/${randomUUID()}.${extension}`;
  const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${path}`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": contentType,
      "x-upsert": "false",
    },
    body: file,
  });
  if (!uploadResponse.ok) {
    const detail = await uploadResponse.text();
    console.error("Supabase Storage profile image upload failed:", uploadResponse.status, detail);
    throw new ApiError(502, "O Supabase não conseguiu salvar sua foto. Confira o bucket de Storage.");
  }

  const image = `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${path}`;
  res.status(201).json({ image });
});

uploadRouter.post("/produtor/imagens", uploadRateLimit, requireAuth, requireRole("producer"), async (req, res) => {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "agrifam-images";
  if (!supabaseUrl || !serviceKey) {
    throw new ApiError(503, "Configure SUPABASE_URL e SUPABASE_SECRET_KEY para habilitar uploads.");
  }

  const dataUrl = typeof req.body?.dataUrl === "string" ? req.body.dataUrl : "";
  const kind = req.body?.kind === "store" ? "store" : "products";
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new ApiError(400, "Envie uma imagem PNG, JPG ou WebP válida.");
  const contentType = match[1];
  const file = Buffer.from(match[2], "base64");
  if (!file.length || file.length > 3 * 1024 * 1024) {
    throw new ApiError(400, "A imagem deve ter no máximo 3 MB.");
  }
  const producer = await db.query.producers.findFirst({ where: eq(producers.userId, req.user!.sub) });
  if (!producer) throw new ApiError(404, "Perfil de produtor não encontrado.");

  const extension = contentType === "image/jpeg" ? "jpg" : contentType.split("/")[1];
  const path = `${producer.id}/${kind}/${randomUUID()}.${extension}`;
  const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${path}`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": contentType,
      "x-upsert": "false",
    },
    body: file,
  });
  if (!uploadResponse.ok) {
    const detail = await uploadResponse.text();
    console.error("Supabase Storage upload failed:", uploadResponse.status, detail);
    throw new ApiError(502, "O Supabase não conseguiu salvar a imagem. Confira o bucket de Storage.");
  }

  const image = `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${path}`;
  res.status(201).json({ image });
});
