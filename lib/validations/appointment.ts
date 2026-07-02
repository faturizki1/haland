import { z } from "zod";

export const appointmentStatusEnum = z.enum([
  "PENDING",
  "CONFIRMED",
  "CHECKED_IN",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);

export const createAppointmentSchema = z.object({
  petId: z.string().trim().min(1),
  doctorId: z.string().trim().min(1),
  scheduledAt: z.coerce.date(),
  complaint: z.string().trim().max(1000).optional(),
  status: appointmentStatusEnum.optional(),
});

export const updateAppointmentStatusSchema = z.object({
  id: z.string().trim().min(1),
  status: appointmentStatusEnum,
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentStatusInput = z.infer<typeof updateAppointmentStatusSchema>;
export type AppointmentStatus = z.infer<typeof appointmentStatusEnum>;
