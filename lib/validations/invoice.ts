import { z } from "zod";

export const invoiceItemSchema = z.object({
  serviceId: z.string().trim().min(1),
  quantity: z.number().int().min(1),
  price: z.number().int().nonnegative(),
});

export const invoiceSchema = z.object({
  customerId: z.string().trim().min(1),
  appointmentId: z.string().trim().optional(),
  petHotelId: z.string().trim().optional(),
  totalAmount: z.number().int().nonnegative(),
  status: z.enum(["UNPAID", "PAID", "VOID"]).optional(),
  items: z.array(invoiceItemSchema).default([]),
});

export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;
export type InvoiceInput = z.infer<typeof invoiceSchema>;
