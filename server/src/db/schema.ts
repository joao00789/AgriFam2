import { relations, sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  check,
  doublePrecision,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Fases 1, 2, 3 e 4 (Autenticação, Catálogo, Pedidos e Conversas) — todas as fases do
 * backend previstas no TODO.md. A Fase 5 é integrar o frontend a essas rotas.
 */
export const users = pgTable("users", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url").notNull().default(""),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["buyer", "producer"] }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [check("users_role_check", sql`${table.role} in ('buyer', 'producer')`)]);

/**
 * Perfil de produtor, um por usuário com role "producer". Criado junto do cadastro
 * (ver authController.register) porque `POST /api/produtos` depende de já existir um
 * `producerId` para associar o produto.
 */
export const producers = pgTable("producers", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: bigint("user_id", { mode: "number" })
    .notNull()
    .unique()
    .references(() => users.id),
  // Nome da propriedade/negócio (ex.: "Sítio Boa Esperança") — é o valor que aparece
  // no campo `producer` dos produtos, conforme o contrato de types.ts.
  property: text("property").notNull(),
  location: text("location").notNull(),
  specialty: text("specialty").notNull(),
  rating: doublePrecision("rating").notNull().default(5),
  history: text("history").notNull().default(""),
  image: text("image").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

export const categories = pgTable("categories", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: text("name").notNull().unique(),
  // Chave do ícone SVG inline usado hoje em `categoryIcons` no script.js do frontend.
  icon: text("icon").notNull(),
});

export const products = pgTable("products", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  producerId: bigint("producer_id", { mode: "number" })
    .notNull()
    .references(() => producers.id),
  categoryId: bigint("category_id", { mode: "number" })
    .notNull()
    .references(() => categories.id),
  name: text("name").notNull(),
  price: doublePrecision("price").notNull(),
  unit: text("unit").notNull(),
  location: text("location").notNull(),
  rating: doublePrecision("rating").notNull().default(5),
  image: text("image").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

/**
 * Um pedido por checkout, de um comprador autenticado. `status` é simulado (sem
 * gateway de pagamento nesta fase, ver CLAUDE.md): todo pedido nasce "confirmado".
 */
export const orders = pgTable("orders", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  buyerId: bigint("buyer_id", { mode: "number" })
    .notNull()
    .references(() => users.id),
  status: text("status", { enum: ["confirmado"] })
    .notNull()
    .default("confirmado"),
  total: doublePrecision("total").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [check("orders_status_check", sql`${table.status} = 'confirmado'`)]);

/**
 * `productName`/`unitPrice` são uma cópia (snapshot) do produto no momento da compra:
 * o histórico do pedido não deve mudar se o produtor editar o preço depois.
 * `producerId` é redundante com `productId -> products.producerId`, mas evita um join
 * extra para `GET /api/produtor/pedidos`.
 */
export const orderItems = pgTable("order_items", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  orderId: bigint("order_id", { mode: "number" })
    .notNull()
    .references(() => orders.id),
  productId: bigint("product_id", { mode: "number" })
    .notNull()
    .references(() => products.id),
  producerId: bigint("producer_id", { mode: "number" })
    .notNull()
    .references(() => producers.id),
  productName: text("product_name").notNull(),
  unitPrice: doublePrecision("unit_price").notNull(),
  quantity: integer("quantity").notNull(),
  subtotal: doublePrecision("subtotal").notNull(),
});

/**
 * Uma conversa por par comprador-produtor (índice único evita duplicar a thread se o
 * mesmo comprador iniciar contato de novo com o mesmo produtor).
 */
export const conversations = pgTable(
  "conversations",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    buyerId: bigint("buyer_id", { mode: "number" })
      .notNull()
      .references(() => users.id),
    producerId: bigint("producer_id", { mode: "number" })
      .notNull()
      .references(() => producers.id),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("conversations_buyer_producer_unique").on(table.buyerId, table.producerId)],
);

export const messages = pgTable("messages", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  conversationId: bigint("conversation_id", { mode: "number" })
    .notNull()
    .references(() => conversations.id),
  senderId: bigint("sender_id", { mode: "number" })
    .notNull()
    .references(() => users.id),
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  producer: one(producers, {
    fields: [users.id],
    references: [producers.userId],
  }),
  orders: many(orders),
  conversationsAsBuyer: many(conversations),
  messages: many(messages),
}));

export const producersRelations = relations(producers, ({ one, many }) => ({
  user: one(users, {
    fields: [producers.userId],
    references: [users.id],
  }),
  products: many(products),
  conversations: many(conversations),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  producer: one(producers, {
    fields: [products.producerId],
    references: [producers.id],
  }),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  orderItems: many(orderItems),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  buyer: one(users, {
    fields: [orders.buyerId],
    references: [users.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  producer: one(producers, {
    fields: [orderItems.producerId],
    references: [producers.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  buyer: one(users, {
    fields: [conversations.buyerId],
    references: [users.id],
  }),
  producer: one(producers, {
    fields: [conversations.producerId],
    references: [producers.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));
