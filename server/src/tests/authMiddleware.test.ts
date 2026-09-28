import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { describe, expect, it, vi } from "vitest";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { AUTH_COOKIE_NAME } from "../utils/authCookie.js";

const makeRes = () => ({}) as Response;

describe("requireAuth", () => {
  it("lança 401 quando não há cookie de sessão", () => {
    const req = { cookies: {} } as unknown as Request;
    expect(() => requireAuth(req, makeRes(), vi.fn())).toThrow(/Não autenticado/);
  });

  it("lança 401 quando o token é inválido", () => {
    const req = {
      cookies: { [AUTH_COOKIE_NAME]: "token-invalido" },
    } as unknown as Request;
    expect(() => requireAuth(req, makeRes(), vi.fn())).toThrow(/inválida ou expirada/);
  });

  it("popula req.user e chama next quando o token é válido", () => {
    const token = jwt.sign({ sub: 1, role: "buyer" }, process.env.JWT_SECRET!);
    const req = { cookies: { [AUTH_COOKIE_NAME]: token } } as unknown as Request;
    const next = vi.fn();

    requireAuth(req, makeRes(), next);

    expect(req.user).toMatchObject({ sub: 1, role: "buyer" });
    expect(next).toHaveBeenCalledOnce();
  });
});

describe("requireRole", () => {
  it("lança 401 quando não há usuário autenticado", () => {
    const req = {} as unknown as Request;
    expect(() => requireRole("producer")(req, makeRes(), vi.fn())).toThrow(/Não autenticado/);
  });

  it("lança 403 quando o papel do usuário não confere", () => {
    const req = { user: { sub: 1, role: "buyer" } } as unknown as Request;
    expect(() => requireRole("producer")(req, makeRes(), vi.fn())).toThrow(/não permitido/);
  });

  it("chama next quando o papel confere", () => {
    const req = { user: { sub: 1, role: "producer" } } as unknown as Request;
    const next = vi.fn();

    requireRole("producer")(req, makeRes(), next);

    expect(next).toHaveBeenCalledOnce();
  });
});
