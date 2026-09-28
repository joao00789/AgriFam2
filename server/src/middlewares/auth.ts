import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AUTH_COOKIE_NAME } from "../utils/authCookie.js";
import { ApiError } from "./errorHandler.js";

export interface AuthPayload {
  sub: number;
  role: "buyer" | "producer";
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  if (!token) throw new ApiError(401, "Não autenticado.");

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET!) as unknown as AuthPayload;
    next();
  } catch {
    throw new ApiError(401, "Sessão inválida ou expirada.");
  }
};

export const requireRole =
  (role: AuthPayload["role"]) => (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new ApiError(401, "Não autenticado.");
    if (req.user.role !== role) {
      throw new ApiError(403, "Acesso não permitido para este perfil.");
    }
    next();
  };
