import { z } from "zod";

export const appointmentSchema = z.object({
  petId: z.string().trim().min(1),
  doctorId: z.string().trim().min(1),
  scheduledAt: z.coerce.date(),
  complaint: z.string().trim().max(1000).optional(),
  status: z.enum(["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
});

export type AppointmentInput = z.infer<typeof appointmentSchema>;
