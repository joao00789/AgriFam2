import { createApp } from "../server/src/app.js";

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("Configure JWT_SECRET com pelo menos 32 caracteres nas variáveis da Vercel.");
}

export const app = createApp();
