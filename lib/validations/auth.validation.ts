import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  pin: z.string().trim().min(4).max(6).regex(/^[0-9]+$/),
});

export const changeOwnPinSchema = z.object({
  oldPin: z.string().trim().min(4).max(6).regex(/^[0-9]+$/),
  newPin: z.string().trim().min(4).max(6).regex(/^[0-9]+$/),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangeOwnPinInput = z.infer<typeof changeOwnPinSchema>;
