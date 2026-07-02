import { z } from "zod";

export const createStaffSchema = z.object({
  username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  pin: z.string().trim().min(4).max(6).regex(/^[0-9]+$/),
  role: z.enum(["ADMIN", "DOKTER"]),
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).optional(),
});

export const createCustomerAccountSchema = z.object({
  username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  pin: z.string().trim().min(4).max(6).regex(/^[0-9]+$/),
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(255).optional(),
});

export const createUserSchema = z.object({
  username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  pin: z.string().trim().min(4).max(6).regex(/^[0-9]+$/),
  role: z.enum(["ADMIN", "DOKTER", "CUSTOMER"]),
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(255).optional(),
});

export const updateUserSchema = z.object({
  id: z.string().trim().min(1),
  username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  role: z.enum(["ADMIN", "DOKTER", "CUSTOMER"]),
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(255).optional(),
});

export const resetPinSchema = z.object({
  newPin: z.string().trim().min(4).max(6).regex(/^[0-9]+$/),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type CreateCustomerAccountInput = z.infer<typeof createCustomerAccountSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ResetPinInput = z.infer<typeof resetPinSchema>;
