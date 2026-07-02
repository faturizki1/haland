import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(255).optional(),
});

export const createCustomerSchema = customerSchema.extend({
  username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  pin: z.string().trim().min(4).max(6).regex(/^[0-9]+$/),
});

export type CustomerInput = z.infer<typeof customerSchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
