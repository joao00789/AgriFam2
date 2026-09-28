import { and, asc, desc, eq } from "drizzle-orm";
import type { Request, Response } from "express";
import { db } from "../db/client.js";
import { conversations, messages, producers } from "../db/schema.js";
import { ApiError } from "../middlewares/errorHandler.js";
import { createConversationSchema, sendMessageSchema } from "../schemas/conversations.js";
import { parseIdParam } from "../utils/parseIdParam.js";

type ConversationRow = typeof conversations.$inferSelect;

// Garante que o usuário autenticado é o comprador ou o dono do perfil de produtor da
// conversa; lança 404/403 e nunca deixa passar quem não participa.
const requireParticipant = async (
  conversationId: number,
  userId: number,
): Promise<ConversationRow> => {
  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
  });
  if (!conversation) throw new ApiError(404, "Conversa não encontrada.");

  if (conversation.buyerId === userId) return conversation;

  const producerProfile = await db.query.producers.findFirst({
    where: eq(producers.id, conversation.producerId),
  });
  if (producerProfile?.userId === userId) return conversation;

  throw new ApiError(403, "Você não participa desta conversa.");
};

export const listConversations = async (req: Request, res: Response) => {
  const producerProfile = await db.query.producers.findFirst({
    where: eq(producers.userId, req.user!.sub),
  });

  const rows = await db.query.conversations.findMany({
    where: producerProfile
      ? (table, { or, eq }) =>
          or(eq(table.buyerId, req.user!.sub), eq(table.producerId, producerProfile.id))
      : eq(conversations.buyerId, req.user!.sub),
    with: {
      buyer: true,
      producer: { with: { user: true } },
      // `created_at` só tem precisão de segundo no SQLite — desempata por `id`
      // (sempre crescente) para pegar a mensagem mais recente de verdade.
      messages: { orderBy: [desc(messages.createdAt), desc(messages.id)], limit: 1 },
    },
    orderBy: [desc(conversations.createdAt), desc(conversations.id)],
  });

  res.json(
    rows.map((row) => ({
      id: row.id,
      buyer: { id: row.buyer.id, name: row.buyer.name, avatarUrl: row.buyer.avatarUrl },
      producer: {
        id: row.producer.id,
        property: row.producer.property,
        name: row.producer.user.name,
        avatarUrl: row.producer.user.avatarUrl,
      },
      lastMessage: row.messages[0]
        ? {
            text: row.messages[0].text,
            senderId: row.messages[0].senderId,
            createdAt: row.messages[0].createdAt,
          }
        : null,
      createdAt: row.createdAt,
    })),
  );
};

export const createConversation = async (req: Request, res: Response) => {
  const parsed = createConversationSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const { producerId } = parsed.data;

  const producerProfile = await db.query.producers.findFirst({
    where: eq(producers.id, producerId),
  });
  if (!producerProfile) throw new ApiError(404, "Produtor não encontrado.");
  if (producerProfile.userId === req.user!.sub) {
    throw new ApiError(400, "Você não pode iniciar uma conversa com você mesmo.");
  }

  const existing = await db.query.conversations.findFirst({
    where: and(eq(conversations.buyerId, req.user!.sub), eq(conversations.producerId, producerId)),
  });
  if (existing) {
    res.json({
      id: existing.id,
      buyerId: existing.buyerId,
      producerId: existing.producerId,
      createdAt: existing.createdAt,
    });
    return;
  }

  const [conversation] = await db
    .insert(conversations)
    .values({ buyerId: req.user!.sub, producerId })
    .returning();

  res.status(201).json({
    id: conversation.id,
    buyerId: conversation.buyerId,
    producerId: conversation.producerId,
    createdAt: conversation.createdAt,
  });
};

export const listMessages = async (req: Request, res: Response) => {
  const id = parseIdParam(req.params.id);
  await requireParticipant(id, req.user!.sub);

  const rows = await db.query.messages.findMany({
    where: eq(messages.conversationId, id),
    orderBy: [asc(messages.createdAt), asc(messages.id)],
  });

  res.json(
    rows.map((message) => ({
      id: message.id,
      senderId: message.senderId,
      text: message.text,
      createdAt: message.createdAt,
    })),
  );
};

export const sendMessage = async (req: Request, res: Response) => {
  const id = parseIdParam(req.params.id);
  await requireParticipant(id, req.user!.sub);

  const parsed = sendMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const [message] = await db
    .insert(messages)
    .values({ conversationId: id, senderId: req.user!.sub, text: parsed.data.text })
    .returning();

  res.status(201).json({
    id: message.id,
    senderId: message.senderId,
    text: message.text,
    createdAt: message.createdAt,
  });
};
