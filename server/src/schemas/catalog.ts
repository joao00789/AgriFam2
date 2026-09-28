import { z } from "zod";

export const productInputSchema = z.object({
  name: z
    .string({ message: "Nome é obrigatório." })
    .trim()
    .min(2, { message: "Nome deve ter pelo menos 2 caracteres." }),
  price: z.coerce
    .number({ message: "Preço é obrigatório." })
    .positive({ message: "Preço deve ser maior que zero." }),
  unit: z
    .string({ message: "Unidade é obrigatória." })
    .trim()
    .min(1, { message: "Unidade é obrigatória." }),
  location: z
    .string({ message: "Localização é obrigatória." })
    .trim()
    .min(2, { message: "Localização deve ter pelo menos 2 caracteres." }),
  category: z
    .string({ message: "Categoria é obrigatória." })
    .trim()
    .min(1, { message: "Categoria é obrigatória." }),
  image: z.string().trim().optional().default(""),
  rating: z.coerce
    .number()
    .min(0, { message: "Nota deve ser entre 0 e 5." })
    .max(5, { message: "Nota deve ser entre 0 e 5." })
    .optional()
    .default(5),
});

export const productUpdateSchema = productInputSchema.partial();

export type ProductInput = z.infer<typeof productInputSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
