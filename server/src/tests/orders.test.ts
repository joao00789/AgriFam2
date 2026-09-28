import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { db } from "../db/client.js";
import { categories } from "../db/schema.js";

const app = createApp();

const uniqueEmail = (label: string) =>
  `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@teste.com`;

const registerBuyer = async (overrides: Record<string, unknown> = {}) => {
  const email = uniqueEmail("comprador");
  const response = await request(app)
    .post("/api/auth/register")
    .send({ name: "Comprador Teste", email, password: "senha1234", role: "buyer", ...overrides });
  return { email, cookie: response.headers["set-cookie"]! };
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
      property: "Sítio Pedido",
      location: "Teresina - PI",
      specialty: "Verduras",
      ...overrides,
    });
  return { email, cookie: response.headers["set-cookie"]!, body: response.body };
};

let categoryName: string;

beforeAll(async () => {
  categoryName = `Categoria Pedido ${Date.now()}`;
  await db.insert(categories).values({ name: categoryName, icon: "leaf" });
});

const createProduct = async (
  producerCookie: string | string[],
  overrides: Record<string, unknown> = {},
) => {
  const response = await request(app)
    .post("/api/produtos")
    .set("Cookie", producerCookie as string[])
    .send({
      name: "Produto Pedido",
      price: 10,
      unit: "kg",
      location: "Teresina - PI",
      category: categoryName,
      ...overrides,
    });
  return response.body;
};

describe("POST /api/pedidos", () => {
  it("rejeita sem autenticação", async () => {
    const response = await request(app)
      .post("/api/pedidos")
      .send({ items: [{ productId: 1, quantity: 1 }] });
    expect(response.status).toBe(401);
  });

  it("rejeita pedido vazio", async () => {
    const buyer = await registerBuyer();
    const response = await request(app).post("/api/pedidos").set("Cookie", buyer.cookie).send({ items: [] });
    expect(response.status).toBe(400);
  });

  it("rejeita pedido com produto inexistente", async () => {
    const buyer = await registerBuyer();
    const response = await request(app)
      .post("/api/pedidos")
      .set("Cookie", buyer.cookie)
      .send({ items: [{ productId: 999999, quantity: 1 }] });
    expect(response.status).toBe(400);
  });

  it("cria o pedido recalculando o total pelo preço real do produto, ignorando o que o cliente envia", async () => {
    const producer = await registerProducer({ property: "Sítio Preço" });
    const product = await createProduct(producer.cookie, { name: "Alface Pedido", price: 5 });

    const buyer = await registerBuyer();
    const response = await request(app)
      .post("/api/pedidos")
      .set("Cookie", buyer.cookie)
      .send({ items: [{ productId: product.id, quantity: 3, price: 999 }] });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe("confirmado");
    expect(response.body.total).toBe(15);
    expect(response.body.items[0]).toMatchObject({
      productId: product.id,
      name: "Alface Pedido",
      unitPrice: 5,
      quantity: 3,
      subtotal: 15,
    });
  });
});

describe("GET /api/pedidos", () => {
  it("lista só os pedidos do comprador autenticado", async () => {
    const producer = await registerProducer({ property: "Sítio Lista" });
    const product = await createProduct(producer.cookie, { name: "Produto Lista" });

    const buyerA = await registerBuyer();
    await request(app)
      .post("/api/pedidos")
      .set("Cookie", buyerA.cookie)
      .send({ items: [{ productId: product.id, quantity: 1 }] });

    const buyerB = await registerBuyer();
    const listB = await request(app).get("/api/pedidos").set("Cookie", buyerB.cookie);
    expect(listB.status).toBe(200);
    expect(listB.body).toEqual([]);

    const listA = await request(app).get("/api/pedidos").set("Cookie", buyerA.cookie);
    expect(listA.status).toBe(200);
    expect(listA.body.length).toBe(1);
  });
});

describe("GET /api/pedidos/:id", () => {
  it("retorna 404 para pedido inexistente", async () => {
    const buyer = await registerBuyer();
    const response = await request(app).get("/api/pedidos/999999").set("Cookie", buyer.cookie);
    expect(response.status).toBe(404);
  });

  it("rejeita ver pedido de outro comprador", async () => {
    const producer = await registerProducer({ property: "Sítio Outro Pedido" });
    const product = await createProduct(producer.cookie, { name: "Produto Outro" });

    const owner = await registerBuyer();
    const created = await request(app)
      .post("/api/pedidos")
      .set("Cookie", owner.cookie)
      .send({ items: [{ productId: product.id, quantity: 1 }] });

    const intruder = await registerBuyer();
    const response = await request(app)
      .get(`/api/pedidos/${created.body.id}`)
      .set("Cookie", intruder.cookie);
    expect(response.status).toBe(403);
  });
});

describe("GET /api/produtor/pedidos", () => {
  it("produtor vê os itens dos pedidos que incluem seus produtos", async () => {
    const producer = await registerProducer({ property: "Sítio Produtor Pedido" });
    const product = await createProduct(producer.cookie, { name: "Produto Produtor" });

    const buyer = await registerBuyer({ name: "Comprador Visível" });
    await request(app)
      .post("/api/pedidos")
      .set("Cookie", buyer.cookie)
      .send({ items: [{ productId: product.id, quantity: 2 }] });

    const response = await request(app).get("/api/produtor/pedidos").set("Cookie", producer.cookie);
    expect(response.status).toBe(200);
    expect(
      response.body.some(
        (row: { productId: number; buyerName: string }) =>
          row.productId === product.id && row.buyerName === "Comprador Visível",
      ),
    ).toBe(true);
  });

  it("rejeita acesso de comprador (role errado)", async () => {
    const buyer = await registerBuyer();
    const response = await request(app).get("/api/produtor/pedidos").set("Cookie", buyer.cookie);
    expect(response.status).toBe(403);
  });
});
