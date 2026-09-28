import { z } from "zod";

const roleSchema = z
  .string()
  .refine((value) => value === "buyer" || value === "producer", {
    message: "Perfil deve ser 'buyer' (comprador) ou 'producer' (produtor).",
  })
  .transform((value) => value as "buyer" | "producer");

export const registerSchema = z.object({
  name: z
    .string({ message: "Nome é obrigatório." })
    .trim()
    .min(2, { message: "Nome deve ter pelo menos 2 caracteres." }),
  email: z
    .string({ message: "Email é obrigatório." })
    .trim()
    .toLowerCase()
    .email({ message: "Email inválido." }),
  password: z
    .string({ message: "Senha é obrigatória." })
    .min(8, { message: "Senha deve ter pelo menos 8 caracteres." }),
  role: roleSchema,
});

// Só é validado quando role === "producer" (ver authController.register). Sem esses
// dados não existe `producerId` para associar produtos em POST /api/produtos.
export const producerProfileSchema = z.object({
  property: z
    .string({ message: "Nome da propriedade é obrigatório." })
    .trim()
    .min(2, { message: "Nome da propriedade deve ter pelo menos 2 caracteres." }),
  location: z
    .string({ message: "Localização é obrigatória." })
    .trim()
    .min(2, { message: "Localização deve ter pelo menos 2 caracteres." }),
  specialty: z
    .string({ message: "Especialidade é obrigatória." })
    .trim()
    .min(2, { message: "Especialidade deve ter pelo menos 2 caracteres." }),
  history: z.string().trim().optional().default(""),
  image: z.string().trim().optional().default(""),
});

export const loginSchema = z.object({
  email: z
    .string({ message: "Email é obrigatório." })
    .trim()
    .toLowerCase()
    .email({ message: "Email inválido." }),
  password: z.string({ message: "Senha é obrigatória." }).min(1, {
    message: "Senha é obrigatória.",
  }),
});

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres."),
  email: z.string().trim().toLowerCase().email("Email inválido."),
  avatarUrl: z.string().trim().max(2048).optional(),
  property: z.string().trim().min(2).optional(),
  location: z.string().trim().min(2).optional(),
  specialty: z.string().trim().min(2).optional(),
  history: z.string().trim().max(2000).optional(),
  image: z.string().trim().max(2048).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, "A nova senha deve ter pelo menos 8 caracteres.").optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type ProducerProfileInput = z.infer<typeof producerProfileSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
