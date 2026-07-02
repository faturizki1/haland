import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(255).optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;
