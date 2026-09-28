import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";

const app = createApp();

const uniqueEmail = (label: string) =>
  `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@teste.com`;

describe("POST /api/auth/register", () => {
  it("cadastra um novo comprador e retorna o usuário sem a senha", async () => {
    const email = uniqueEmail("buyer");

    const response = await request(app).post("/api/auth/register").send({
      name: "Maria Compradora",
      email,
      password: "senha1234",
      role: "buyer",
    });

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({ name: "Maria Compradora", email, role: "buyer" });
    expect(response.body.user).not.toHaveProperty("passwordHash");
    expect(response.headers["set-cookie"]?.[0]).toMatch(/agrifam_token=/);
  });

  it("cadastra um novo produtor com perfil (propriedade/localização/especialidade)", async () => {
    const email = uniqueEmail("producer");

    const response = await request(app).post("/api/auth/register").send({
      name: "Seu João",
      email,
      password: "senha1234",
      role: "producer",
      property: "Sítio Novo",
      location: "Teresina - PI",
      specialty: "Frutas",
    });

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({ name: "Seu João", email, role: "producer" });
  });

  it("rejeita cadastro de produtor sem os dados da propriedade", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "Sem Propriedade",
      email: uniqueEmail("semprop"),
      password: "senha1234",
      role: "producer",
    });

    expect(response.status).toBe(400);
  });

  it("rejeita cadastro com email já usado", async () => {
    const email = uniqueEmail("dup");
    await request(app).post("/api/auth/register").send({
      name: "Produtor Um",
      email,
      password: "senha1234",
      role: "producer",
      property: "Sítio Um",
      location: "Teresina - PI",
      specialty: "Verduras",
    });

    const response = await request(app).post("/api/auth/register").send({
      name: "Produtor Dois",
      email,
      password: "outrasenha",
      role: "producer",
      property: "Sítio Dois",
      location: "Teresina - PI",
      specialty: "Frutas",
    });

    expect(response.status).toBe(409);
  });

  it("rejeita cadastro com senha curta", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "Alguém",
      email: uniqueEmail("curta"),
      password: "123",
      role: "buyer",
    });

    expect(response.status).toBe(400);
  });

  it("rejeita cadastro com perfil (role) inválido", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "Alguém",
      email: uniqueEmail("roleinvalido"),
      password: "senha1234",
      role: "admin",
    });

    expect(response.status).toBe(400);
  });
});

describe("POST /api/auth (login)", () => {
  it("faz login com credenciais corretas", async () => {
    const email = uniqueEmail("login");
    await request(app).post("/api/auth/register").send({
      name: "Login Ok",
      email,
      password: "senha1234",
      role: "buyer",
    });

    const response = await request(app).post("/api/auth").send({ email, password: "senha1234" });

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe(email);
    expect(response.headers["set-cookie"]?.[0]).toMatch(/agrifam_token=/);
  });

  it("rejeita login com senha errada", async () => {
    const email = uniqueEmail("senhaerrada");
    await request(app).post("/api/auth/register").send({
      name: "Senha Errada",
      email,
      password: "senha1234",
      role: "buyer",
    });

    const response = await request(app)
      .post("/api/auth")
      .send({ email, password: "senhaerrada123" });

    expect(response.status).toBe(401);
  });

  it("rejeita login de email inexistente", async () => {
    const response = await request(app)
      .post("/api/auth")
      .send({ email: uniqueEmail("naoexiste"), password: "senha1234" });

    expect(response.status).toBe(401);
  });
});

describe("GET /api/auth/me", () => {
  it("rejeita sem cookie de sessão", async () => {
    const response = await request(app).get("/api/auth/me");
    expect(response.status).toBe(401);
  });

  it("retorna o usuário autenticado com cookie válido", async () => {
    const email = uniqueEmail("me");
    const registerResponse = await request(app).post("/api/auth/register").send({
      name: "Sessão Válida",
      email,
      password: "senha1234",
      role: "producer",
      property: "Sítio Sessão",
      location: "Teresina - PI",
      specialty: "Verduras",
    });
    const cookie = registerResponse.headers["set-cookie"]!;

    const response = await request(app).get("/api/auth/me").set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({ email, role: "producer" });
  });
});

describe("POST /api/auth/logout", () => {
  it("responde ok e o cookie deixa de autenticar depois", async () => {
    const email = uniqueEmail("logout");
    const registerResponse = await request(app).post("/api/auth/register").send({
      name: "Logout Teste",
      email,
      password: "senha1234",
      role: "buyer",
    });
    const sessionCookie = registerResponse.headers["set-cookie"]!;

    const logoutResponse = await request(app).post("/api/auth/logout").set("Cookie", sessionCookie);
    expect(logoutResponse.status).toBe(200);

    const clearedCookie = logoutResponse.headers["set-cookie"]!;
    const meResponse = await request(app).get("/api/auth/me").set("Cookie", clearedCookie);
    expect(meResponse.status).toBe(401);
  });
});
