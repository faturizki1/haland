import { z } from "zod";

export const serviceSchema = z.object({
  name: z.string().trim().min(2).max(100),
  price: z.number().int().nonnegative(),
  category: z.string().trim().min(2).max(100),
});

export const updateServiceSchema = serviceSchema.extend({
  id: z.string().trim().min(1),
});

export type ServiceInput = z.infer<typeof serviceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
