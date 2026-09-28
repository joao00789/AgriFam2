import { z } from "zod";

export const createConversationSchema = z.object({
  producerId: z.coerce
    .number({ message: "producerId é obrigatório." })
    .int()
    .positive({ message: "producerId inválido." }),
});

export const sendMessageSchema = z.object({
  text: z
    .string({ message: "Mensagem é obrigatória." })
    .trim()
    .min(1, { message: "Mensagem não pode ser vazia." })
    .max(2000, { message: "Mensagem muito longa (máximo 2000 caracteres)." }),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
