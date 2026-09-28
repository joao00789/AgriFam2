import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { db } from "../db/client.js";
import { categories } from "../db/schema.js";

const app = createApp();

const uniqueEmail = (label: string) =>
  `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@teste.com`;

const registerProducer = async (overrides: Record<string, unknown> = {}) => {
  const email = uniqueEmail("produtor");
  const response = await request(app)
    .post("/api/auth/register")
    .send({
      name: "Produtor Teste",
      email,
      password: "senha1234",
      role: "producer",
      property: "Sítio Teste",
      location: "Teresina - PI",
      specialty: "Verduras",
      ...overrides,
    });
  return { email, cookie: response.headers["set-cookie"]!, body: response.body };
};

const registerBuyer = async () => {
  const email = uniqueEmail("comprador");
  const response = await request(app).post("/api/auth/register").send({
    name: "Comprador Teste",
    email,
    password: "senha1234",
    role: "buyer",
  });
  return { email, cookie: response.headers["set-cookie"]! };
};

let categoryName: string;

beforeAll(async () => {
  categoryName = `Categoria Teste ${Date.now()}`;
  await db.insert(categories).values({ name: categoryName, icon: "leaf" });
});

describe("POST /api/produtos", () => {
  it("cadastra produto autenticado como produtor e aparece na listagem", async () => {
    const producer = await registerProducer({ property: "Sítio Alface" });

    const createResponse = await request(app)
      .post("/api/produtos")
      .set("Cookie", producer.cookie)
      .send({
        name: "Alface",
        price: 3.5,
        unit: "unidade",
        location: "Teresina - PI",
        category: categoryName,
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body).toMatchObject({
      name: "Alface",
      price: 3.5,
      category: categoryName,
      producer: "Sítio Alface",
    });

    const listResponse = await request(app).get("/api/produtos").query({ search: "alface" });
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.some((p: { name: string }) => p.name === "Alface")).toBe(true);
  });

  it("rejeita criação de produto sem autenticação", async () => {
    const response = await request(app).post("/api/produtos").send({
      name: "Sem Login",
      price: 1,
      unit: "kg",
      location: "Teresina - PI",
      category: categoryName,
    });
    expect(response.status).toBe(401);
  });

  it("rejeita criação de produto por comprador (role errado)", async () => {
    const buyer = await registerBuyer();
    const response = await request(app).post("/api/produtos").set("Cookie", buyer.cookie).send({
      name: "Comprador Não Pode",
      price: 1,
      unit: "kg",
      location: "Teresina - PI",
      category: categoryName,
    });
    expect(response.status).toBe(403);
  });

  it("rejeita criação de produto com categoria inexistente", async () => {
    const producer = await registerProducer();
    const response = await request(app).post("/api/produtos").set("Cookie", producer.cookie).send({
      name: "Categoria Errada",
      price: 1,
      unit: "kg",
      location: "Teresina - PI",
      category: "Categoria Que Não Existe",
    });
    expect(response.status).toBe(400);
  });

  it("rejeita criação de produto com preço inválido", async () => {
    const producer = await registerProducer();
    const response = await request(app).post("/api/produtos").set("Cookie", producer.cookie).send({
      name: "Preço Inválido",
      price: -5,
      unit: "kg",
      location: "Teresina - PI",
      category: categoryName,
    });
    expect(response.status).toBe(400);
  });
});

describe("GET /api/produtos", () => {
  it("filtra produtos por categoria", async () => {
    const producer = await registerProducer({ property: "Sítio Cenoura" });
    await request(app).post("/api/produtos").set("Cookie", producer.cookie).send({
      name: "Cenoura",
      price: 4,
      unit: "kg",
      location: "Teresina - PI",
      category: categoryName,
    });

    const response = await request(app).get("/api/produtos").query({ category: categoryName });
    expect(response.status).toBe(200);
    expect(
      response.body.every((p: { category: string }) => p.category === categoryName),
    ).toBe(true);
  });

  it("ordena produtos por menor preço", async () => {
    const response = await request(app)
      .get("/api/produtos")
      .query({ category: categoryName, sort: "price-low" });

    const prices = response.body.map((p: { price: number }) => p.price);
    const sorted = [...prices].sort((a, b) => a - b);
    expect(prices).toEqual(sorted);
  });

  it("retorna 404 para produto inexistente", async () => {
    const response = await request(app).get("/api/produtos/999999");
    expect(response.status).toBe(404);
  });

  it("retorna 400 para id de produto inválido", async () => {
    const response = await request(app).get("/api/produtos/abc");
    expect(response.status).toBe(400);
  });
});

describe("PATCH e DELETE /api/produtos/:id", () => {
  it("produtor edita seu próprio produto", async () => {
    const producer = await registerProducer({ property: "Sítio Pepino" });
    const created = await request(app).post("/api/produtos").set("Cookie", producer.cookie).send({
      name: "Pepino",
      price: 2,
      unit: "kg",
      location: "Teresina - PI",
      category: categoryName,
    });

    const updateResponse = await request(app)
      .patch(`/api/produtos/${created.body.id}`)
      .set("Cookie", producer.cookie)
      .send({ price: 2.5 });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.price).toBe(2.5);
  });

  it("rejeita edição de produto por outro produtor", async () => {
    const owner = await registerProducer({ property: "Sítio Beterraba" });
    const created = await request(app).post("/api/produtos").set("Cookie", owner.cookie).send({
      name: "Beterraba",
      price: 5,
      unit: "kg",
      location: "Teresina - PI",
      category: categoryName,
    });

    const another = await registerProducer({ property: "Sítio Intruso" });
    const updateResponse = await request(app)
      .patch(`/api/produtos/${created.body.id}`)
      .set("Cookie", another.cookie)
      .send({ price: 1 });

    expect(updateResponse.status).toBe(403);
  });

  it("produtor remove seu próprio produto e ele some da listagem", async () => {
    const producer = await registerProducer({ property: "Sítio Couve" });
    const created = await request(app).post("/api/produtos").set("Cookie", producer.cookie).send({
      name: "Couve",
      price: 3,
      unit: "maço",
      location: "Teresina - PI",
      category: categoryName,
    });

    const deleteResponse = await request(app)
      .delete(`/api/produtos/${created.body.id}`)
      .set("Cookie", producer.cookie);
    expect(deleteResponse.status).toBe(200);

    const getResponse = await request(app).get(`/api/produtos/${created.body.id}`);
    expect(getResponse.status).toBe(404);
  });

  it("rejeita remoção de produto por outro produtor", async () => {
    const owner = await registerProducer({ property: "Sítio Original" });
    const created = await request(app).post("/api/produtos").set("Cookie", owner.cookie).send({
      name: "Abóbora",
      price: 6,
      unit: "kg",
      location: "Teresina - PI",
      category: categoryName,
    });

    const another = await registerProducer({ property: "Sítio Outro" });
    const deleteResponse = await request(app)
      .delete(`/api/produtos/${created.body.id}`)
      .set("Cookie", another.cookie);
    expect(deleteResponse.status).toBe(403);
  });
});

describe("GET /api/produtores", () => {
  it("lista produtores com o nome da pessoa e da propriedade", async () => {
    await registerProducer({ name: "Dona Teste", property: "Sítio Listagem" });

    const response = await request(app).get("/api/produtores");
    expect(response.status).toBe(200);
    expect(
      response.body.some(
        (p: { property: string; name: string }) =>
          p.property === "Sítio Listagem" && p.name === "Dona Teste",
      ),
    ).toBe(true);
  });

  it("retorna 404 para produtor inexistente", async () => {
    const response = await request(app).get("/api/produtores/999999");
    expect(response.status).toBe(404);
  });
});

describe("GET /api/categorias", () => {
  it("retorna categorias com a contagem real de produtos", async () => {
    const response = await request(app).get("/api/categorias");
    expect(response.status).toBe(200);

    const found = response.body.find((c: { name: string }) => c.name === categoryName);
    expect(found).toBeDefined();
    expect(found.count).toMatch(/^\d+ produtos?$/);
  });
});

describe("GET /api/produtor/produtos", () => {
  it("rejeita sem autenticação", async () => {
    const response = await request(app).get("/api/produtor/produtos");
    expect(response.status).toBe(401);
  });

  it("rejeita comprador (role errado)", async () => {
    const buyer = await registerBuyer();
    const response = await request(app)
      .get("/api/produtor/produtos")
      .set("Cookie", buyer.cookie);
    expect(response.status).toBe(403);
  });

  it("retorna só os produtos do produtor autenticado, não os de outros", async () => {
    const producerA = await registerProducer({ property: "Sítio Meus Produtos A" });
    await request(app).post("/api/produtos").set("Cookie", producerA.cookie).send({
      name: "Produto Só do A",
      price: 9,
      unit: "kg",
      location: "Teresina - PI",
      category: categoryName,
    });

    const producerB = await registerProducer({ property: "Sítio Meus Produtos B" });
    await request(app).post("/api/produtos").set("Cookie", producerB.cookie).send({
      name: "Produto Só do B",
      price: 7,
      unit: "kg",
      location: "Teresina - PI",
      category: categoryName,
    });

    const responseA = await request(app)
      .get("/api/produtor/produtos")
      .set("Cookie", producerA.cookie);

    expect(responseA.status).toBe(200);
    expect(responseA.body.some((p: { name: string }) => p.name === "Produto Só do A")).toBe(true);
    expect(responseA.body.some((p: { name: string }) => p.name === "Produto Só do B")).toBe(false);
  });
});
