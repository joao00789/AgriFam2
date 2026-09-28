import { z } from "zod";

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.coerce
          .number({ message: "productId é obrigatório." })
          .int()
          .positive({ message: "productId inválido." }),
        quantity: z.coerce
          .number({ message: "quantity é obrigatório." })
          .int()
          .positive({ message: "Quantidade deve ser maior que zero." }),
      }),
    )
    .min(1, { message: "O pedido precisa ter pelo menos um item." }),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
