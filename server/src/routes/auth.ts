import { Router } from "express";
import { login, loginWithGoogle, logout, me, register, startGoogleLogin, updateMe } from "../controllers/authController.js";
import { requireAuth } from "../middlewares/auth.js";
import { createRateLimit } from "../middlewares/rateLimit.js";

export const authRouter = Router();
const authRateLimit = createRateLimit(10, 15 * 60 * 1000);

// POST /api/auth/register — cadastro de comprador ou produtor.
authRouter.post("/register", authRateLimit, register);
authRouter.get("/google", startGoogleLogin);
authRouter.get("/google/config", (_req, res) => {
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  res.json({
    enabled: Boolean(process.env.SUPABASE_URL && publishableKey),
    url: process.env.SUPABASE_URL || null,
    publishableKey: publishableKey || null,
  });
});
authRouter.post("/google/callback", authRateLimit, loginWithGoogle);
// POST /api/auth — login, conforme contrato documentado no README.
authRouter.post("/", authRateLimit, login);
authRouter.post("/logout", logout);
authRouter.get("/me", requireAuth, me);
authRouter.patch("/me", requireAuth, updateMe);
