import { desc, eq, inArray } from "drizzle-orm";
import type { Request, Response } from "express";
import { db } from "../db/client.js";
import { orderItems, orders, producers, products, users } from "../db/schema.js";
import { ApiError } from "../middlewares/errorHandler.js";
import { createOrderSchema } from "../schemas/orders.js";
import { parseIdParam } from "../utils/parseIdParam.js";

type OrderRow = typeof orders.$inferSelect;
type OrderItemRow = typeof orderItems.$inferSelect;

const toOrderResponse = (order: OrderRow, items: OrderItemRow[]) => ({
  id: order.id,
  status: order.status,
  total: order.total,
  createdAt: order.createdAt,
  items: items.map((item) => ({
    productId: item.productId,
    name: item.productName,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    subtotal: item.subtotal,
  })),
});

// -----------------------------------------------------------------------------
// Pedidos do comprador
// -----------------------------------------------------------------------------

export const createOrder = async (req: Request, res: Response) => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const { items } = parsed.data;

  const productIds = items.map((item) => item.productId);
  const productRows = await db.query.products.findMany({
    where: inArray(products.id, productIds),
  });
  const productById = new Map(productRows.map((row) => [row.id, row]));

  for (const item of items) {
    if (!productById.has(item.productId)) {
      throw new ApiError(400, `Produto ${item.productId} não encontrado.`);
    }
  }

  // Preço sempre recalculado a partir do banco — nunca do que o cliente enviar.
  const orderLines = items.map((item) => {
    const product = productById.get(item.productId)!;
    return {
      productId: product.id,
      producerId: product.producerId,
      productName: product.name,
      unitPrice: product.price,
      quantity: item.quantity,
      subtotal: product.price * item.quantity,
    };
  });
  const total = orderLines.reduce((sum, line) => sum + line.subtotal, 0);

  const { order, insertedItems } = await db.transaction(async (tx) => {
    const [order] = await tx
      .insert(orders)
      .values({ buyerId: req.user!.sub, total })
      .returning();
    const insertedItems = await tx
      .insert(orderItems)
      .values(orderLines.map((line) => ({ ...line, orderId: order.id })))
      .returning();
    return { order, insertedItems };
  });

  res.status(201).json(toOrderResponse(order, insertedItems));
};

export const listMyOrders = async (req: Request, res: Response) => {
  const rows = await db.query.orders.findMany({
    where: eq(orders.buyerId, req.user!.sub),
    with: { items: true },
    // `created_at` só tem precisão de segundo no SQLite — desempata por `id`.
    orderBy: [desc(orders.createdAt), desc(orders.id)],
  });
  res.json(rows.map((order) => toOrderResponse(order, order.items)));
};

export const getOrder = async (req: Request, res: Response) => {
  const id = parseIdParam(req.params.id);
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, id),
    with: { items: true },
  });
  if (!order) throw new ApiError(404, "Pedido não encontrado.");
  if (order.buyerId !== req.user!.sub) {
    throw new ApiError(403, "Você só pode ver os seus próprios pedidos.");
  }
  res.json(toOrderResponse(order, order.items));
};

// -----------------------------------------------------------------------------
// Pedidos do produtor (itens que incluem produtos dele, de qualquer comprador)
// -----------------------------------------------------------------------------

export const listProducerOrders = async (req: Request, res: Response) => {
  const producerProfile = await db.query.producers.findFirst({
    where: eq(producers.userId, req.user!.sub),
  });
  if (!producerProfile) throw new ApiError(404, "Perfil de produtor não encontrado.");

  const rows = await db
    .select({
      orderId: orders.id,
      orderStatus: orders.status,
      orderCreatedAt: orders.createdAt,
      buyerName: users.name,
      productId: orderItems.productId,
      productName: orderItems.productName,
      unitPrice: orderItems.unitPrice,
      quantity: orderItems.quantity,
      subtotal: orderItems.subtotal,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(users, eq(orders.buyerId, users.id))
    .where(eq(orderItems.producerId, producerProfile.id))
    .orderBy(desc(orders.createdAt), desc(orders.id));

  res.json(rows);
};
