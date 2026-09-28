import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";

describe("GET /api/health", () => {
  it("retorna status ok", async () => {
    const app = createApp();
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("responde 404 para rota inexistente", async () => {
    const app = createApp();
    const response = await request(app).get("/api/rota-que-nao-existe");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Rota não encontrada." });
  });
});
