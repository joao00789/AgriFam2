import { and, eq, like, or, sql } from "drizzle-orm";
import type { Request, Response } from "express";
import { db } from "../db/client.js";
import { categories, producers, products, users } from "../db/schema.js";
import { ApiError } from "../middlewares/errorHandler.js";
import { productInputSchema, productUpdateSchema } from "../schemas/catalog.js";
import { parseIdParam } from "../utils/parseIdParam.js";

type ProductRow = {
  id: number;
  name: string;
  price: number;
  unit: string;
  location: string;
  rating: number;
  image: string;
  producerProperty: string;
  categoryName: string;
};

const toProductResponse = (row: ProductRow) => ({
  id: row.id,
  name: row.name,
  price: row.price,
  unit: row.unit,
  producer: row.producerProperty,
  location: row.location,
  category: row.categoryName,
  rating: row.rating,
  image: row.image,
});

const productSelection = {
  id: products.id,
  name: products.name,
  price: products.price,
  unit: products.unit,
  location: products.location,
  rating: products.rating,
  image: products.image,
  producerProperty: producers.property,
  categoryName: categories.name,
};

// -----------------------------------------------------------------------------
// Produtos
// -----------------------------------------------------------------------------

export const listProducts = async (req: Request, res: Response) => {
  const search = String(req.query.search ?? "").trim().toLowerCase();
  const category = String(req.query.category ?? "").trim();
  const sort = String(req.query.sort ?? "featured");

  const rows = await db
    .select(productSelection)
    .from(products)
    .innerJoin(producers, eq(products.producerId, producers.id))
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(
      and(
        category ? eq(categories.name, category) : undefined,
        search
          ? or(
              like(sql`lower(${products.name})`, `%${search}%`),
              like(sql`lower(${producers.property})`, `%${search}%`),
              like(sql`lower(${categories.name})`, `%${search}%`),
              like(sql`lower(${products.location})`, `%${search}%`),
            )
          : undefined,
      ),
    );

  let list = rows.map(toProductResponse);
  if (sort === "price-low") list = [...list].sort((a, b) => a.price - b.price);
  if (sort === "rating") list = [...list].sort((a, b) => b.rating - a.rating);

  res.json(list);
};

// Usado pela tela "Meus produtos" do produtor (frontend) para saber o que já existe
// antes de decidir se cria ou edita — não tem equivalente no contrato original de
// GET /api/produtos, que não filtra por dono.
export const listMyProducts = async (req: Request, res: Response) => {
  const producerProfile = await db.query.producers.findFirst({
    where: eq(producers.userId, req.user!.sub),
  });
  if (!producerProfile) throw new ApiError(404, "Perfil de produtor não encontrado.");

  const rows = await db
    .select(productSelection)
    .from(products)
    .innerJoin(producers, eq(products.producerId, producers.id))
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.producerId, producerProfile.id));

  res.json(rows.map(toProductResponse));
};

export const getProduct = async (req: Request, res: Response) => {
  const id = parseIdParam(req.params.id);
  const [row] = await db
    .select(productSelection)
    .from(products)
    .innerJoin(producers, eq(products.producerId, producers.id))
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.id, id));

  if (!row) throw new ApiError(404, "Produto não encontrado.");
  res.json(toProductResponse(row));
};

export const createProduct = async (req: Request, res: Response) => {
  const parsed = productInputSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const { name, price, unit, location, category, image, rating } = parsed.data;

  const producerProfile = await db.query.producers.findFirst({
    where: eq(producers.userId, req.user!.sub),
  });
  if (!producerProfile) throw new ApiError(404, "Perfil de produtor não encontrado.");

  const categoryRow = await db.query.categories.findFirst({
    where: eq(categories.name, category),
  });
  if (!categoryRow) throw new ApiError(400, `Categoria "${category}" não existe.`);

  const [product] = await db
    .insert(products)
    .values({
      producerId: producerProfile.id,
      categoryId: categoryRow.id,
      name,
      price,
      unit,
      location,
      image,
      rating,
    })
    .returning();

  res.status(201).json(
    toProductResponse({
      ...product,
      producerProperty: producerProfile.property,
      categoryName: categoryRow.name,
    }),
  );
};

const getOwnedProduct = async (productId: number, userId: number) => {
  const product = await db.query.products.findFirst({ where: eq(products.id, productId) });
  if (!product) throw new ApiError(404, "Produto não encontrado.");

  const producerProfile = await db.query.producers.findFirst({
    where: eq(producers.id, product.producerId),
  });
  if (!producerProfile || producerProfile.userId !== userId) {
    throw new ApiError(403, "Você só pode alterar produtos da sua própria propriedade.");
  }
  return { product, producerProfile };
};

export const updateProduct = async (req: Request, res: Response) => {
  const id = parseIdParam(req.params.id);
  const parsed = productUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const { producerProfile } = await getOwnedProduct(id, req.user!.sub);

  let categoryRow: { id: number; name: string } | undefined;
  if (parsed.data.category) {
    categoryRow = await db.query.categories.findFirst({
      where: eq(categories.name, parsed.data.category),
    });
    if (!categoryRow) throw new ApiError(400, `Categoria "${parsed.data.category}" não existe.`);
  }

  const { category: _category, ...rest } = parsed.data;
  const [updated] = await db
    .update(products)
    .set({ ...rest, ...(categoryRow ? { categoryId: categoryRow.id } : {}) })
    .where(eq(products.id, id))
    .returning();

  const finalCategoryName =
    categoryRow?.name ??
    (await db.query.categories.findFirst({ where: eq(categories.id, updated.categoryId) }))!.name;

  res.json(
    toProductResponse({
      ...updated,
      producerProperty: producerProfile.property,
      categoryName: finalCategoryName,
    }),
  );
};

export const deleteProduct = async (req: Request, res: Response) => {
  const id = parseIdParam(req.params.id);
  await getOwnedProduct(id, req.user!.sub);

  await db.delete(products).where(eq(products.id, id));
  res.json({ ok: true });
};

// -----------------------------------------------------------------------------
// Produtores
// -----------------------------------------------------------------------------

const producerSelection = {
  id: producers.id,
  name: users.name,
  property: producers.property,
  location: producers.location,
  specialty: producers.specialty,
  rating: producers.rating,
  history: producers.history,
  image: producers.image,
};

export const listProducers = async (_req: Request, res: Response) => {
  const rows = await db.select(producerSelection).from(producers).innerJoin(users, eq(producers.userId, users.id));
  res.json(rows);
};

export const getProducer = async (req: Request, res: Response) => {
  const id = parseIdParam(req.params.id);
  const [row] = await db
    .select(producerSelection)
    .from(producers)
    .innerJoin(users, eq(producers.userId, users.id))
    .where(eq(producers.id, id));

  if (!row) throw new ApiError(404, "Produtor não encontrado.");
  res.json(row);
};

// -----------------------------------------------------------------------------
// Categorias
// -----------------------------------------------------------------------------

export const listCategories = async (_req: Request, res: Response) => {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      icon: categories.icon,
      count: sql<number>`count(${products.id})`,
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(categories.id);

  res.json(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      icon: row.icon,
      count: `${row.count} produto${row.count === 1 ? "" : "s"}`,
    })),
  );
};
