import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";

const app = createApp();

const uniqueEmail = (label: string) =>
  `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@teste.com`;

const registerBuyer = async (overrides: Record<string, unknown> = {}) => {
  const email = uniqueEmail("comprador");
  const response = await request(app)
    .post("/api/auth/register")
    .send({ name: "Comprador Teste", email, password: "senha1234", role: "buyer", ...overrides });
  return { email, cookie: response.headers["set-cookie"] as unknown as string[] };
};

const registerProducer = async (overrides: Record<string, unknown> = {}) => {
  const email = uniqueEmail("produtor");
  const response = await request(app)
    .post("/api/auth/register")
    .send({
      name: "Produtor Teste",
      email,
      password: "senha1234",
      role: "producer",
      property: "Sítio Conversa",
      location: "Teresina - PI",
      specialty: "Verduras",
      ...overrides,
    });
  return {
    email,
    cookie: response.headers["set-cookie"] as unknown as string[],
    producerId: undefined as number | undefined,
  };
};

// O registro não devolve o producerId diretamente (só o `user`) — descobrimos pela
// listagem pública de produtores, igual o frontend faria.
const findProducerId = async (property: string) => {
  const response = await request(app).get("/api/produtores");
  const found = response.body.find((p: { property: string }) => p.property === property);
  return found.id as number;
};

describe("POST /api/conversas", () => {
  it("rejeita sem autenticação", async () => {
    const response = await request(app).post("/api/conversas").send({ producerId: 1 });
    expect(response.status).toBe(401);
  });

  it("rejeita producerId inexistente", async () => {
    const buyer = await registerBuyer();
    const response = await request(app)
      .post("/api/conversas")
      .set("Cookie", buyer.cookie)
      .send({ producerId: 999999 });
    expect(response.status).toBe(404);
  });

  it("cria uma conversa nova entre comprador e produtor", async () => {
    const producer = await registerProducer({ property: "Sítio Conversa Nova" });
    const producerId = await findProducerId("Sítio Conversa Nova");

    const buyer = await registerBuyer();
    const response = await request(app)
      .post("/api/conversas")
      .set("Cookie", buyer.cookie)
      .send({ producerId });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ producerId });
  });

  it("retorna a mesma conversa (200) se o comprador iniciar de novo com o mesmo produtor", async () => {
    const producer = await registerProducer({ property: "Sítio Conversa Duplicada" });
    const producerId = await findProducerId("Sítio Conversa Duplicada");

    const buyer = await registerBuyer();
    const first = await request(app)
      .post("/api/conversas")
      .set("Cookie", buyer.cookie)
      .send({ producerId });
    const second = await request(app)
      .post("/api/conversas")
      .set("Cookie", buyer.cookie)
      .send({ producerId });

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.id).toBe(first.body.id);
  });

  it("rejeita produtor iniciar conversa consigo mesmo", async () => {
    const producer = await registerProducer({ property: "Sítio Consigo Mesmo" });
    const producerId = await findProducerId("Sítio Consigo Mesmo");

    const response = await request(app)
      .post("/api/conversas")
      .set("Cookie", producer.cookie)
      .send({ producerId });

    expect(response.status).toBe(400);
  });
});

describe("GET /api/conversas", () => {
  it("lista a conversa tanto para o comprador quanto para o produtor, e não para terceiros", async () => {
    const producer = await registerProducer({ property: "Sítio Lista Conversa" });
    const producerId = await findProducerId("Sítio Lista Conversa");

    const buyer = await registerBuyer();
    await request(app).post("/api/conversas").set("Cookie", buyer.cookie).send({ producerId });

    const buyerList = await request(app).get("/api/conversas").set("Cookie", buyer.cookie);
    expect(buyerList.status).toBe(200);
    expect(buyerList.body.some((c: { producer: { id: number } }) => c.producer.id === producerId)).toBe(
      true,
    );

    const producerList = await request(app).get("/api/conversas").set("Cookie", producer.cookie);
    expect(producerList.status).toBe(200);
    expect(
      producerList.body.some((c: { producer: { id: number } }) => c.producer.id === producerId),
    ).toBe(true);

    const outsider = await registerBuyer();
    const outsiderList = await request(app).get("/api/conversas").set("Cookie", outsider.cookie);
    expect(outsiderList.body.some((c: { producer: { id: number } }) => c.producer.id === producerId)).toBe(
      false,
    );
  });
});

describe("POST/GET /api/conversas/:id/mensagens", () => {
  it("rejeita envio de mensagem sem autenticação", async () => {
    const response = await request(app).post("/api/conversas/1/mensagens").send({ text: "oi" });
    expect(response.status).toBe(401);
  });

  it("rejeita acesso de quem não participa da conversa", async () => {
    const producer = await registerProducer({ property: "Sítio Mensagem Privada" });
    const producerId = await findProducerId("Sítio Mensagem Privada");

    const buyer = await registerBuyer();
    const conversation = await request(app)
      .post("/api/conversas")
      .set("Cookie", buyer.cookie)
      .send({ producerId });

    const outsider = await registerBuyer();
    const readResponse = await request(app)
      .get(`/api/conversas/${conversation.body.id}/mensagens`)
      .set("Cookie", outsider.cookie);
    expect(readResponse.status).toBe(403);

    const sendResponse = await request(app)
      .post(`/api/conversas/${conversation.body.id}/mensagens`)
      .set("Cookie", outsider.cookie)
      .send({ text: "não devia entrar" });
    expect(sendResponse.status).toBe(403);
  });

  it("rejeita mensagem vazia", async () => {
    const producer = await registerProducer({ property: "Sítio Mensagem Vazia" });
    const producerId = await findProducerId("Sítio Mensagem Vazia");

    const buyer = await registerBuyer();
    const conversation = await request(app)
      .post("/api/conversas")
      .set("Cookie", buyer.cookie)
      .send({ producerId });

    const response = await request(app)
      .post(`/api/conversas/${conversation.body.id}/mensagens`)
      .set("Cookie", buyer.cookie)
      .send({ text: "   " });
    expect(response.status).toBe(400);
  });

  it("comprador e produtor trocam mensagens e ambos conseguem ler o histórico em ordem", async () => {
    const producer = await registerProducer({ property: "Sítio Troca de Mensagem" });
    const producerId = await findProducerId("Sítio Troca de Mensagem");

    const buyer = await registerBuyer();
    const conversation = await request(app)
      .post("/api/conversas")
      .set("Cookie", buyer.cookie)
      .send({ producerId });
    const conversationId = conversation.body.id;

    const firstMessage = await request(app)
      .post(`/api/conversas/${conversationId}/mensagens`)
      .set("Cookie", buyer.cookie)
      .send({ text: "Olá, tem tomate disponível?" });
    expect(firstMessage.status).toBe(201);

    const replyMessage = await request(app)
      .post(`/api/conversas/${conversationId}/mensagens`)
      .set("Cookie", producer.cookie)
      .send({ text: "Tenho sim!" });
    expect(replyMessage.status).toBe(201);

    const history = await request(app)
      .get(`/api/conversas/${conversationId}/mensagens`)
      .set("Cookie", buyer.cookie);

    expect(history.status).toBe(200);
    expect(history.body.map((m: { text: string }) => m.text)).toEqual([
      "Olá, tem tomate disponível?",
      "Tenho sim!",
    ]);

    const listResponse = await request(app).get("/api/conversas").set("Cookie", buyer.cookie);
    const found = listResponse.body.find((c: { id: number }) => c.id === conversationId);
    expect(found.lastMessage).toMatchObject({ text: "Tenho sim!" });
  });
});
