import { z } from "zod";

export const medicalRecordSchema = z.object({
  vitalSign: z.string().trim().max(500).optional(),
  diagnosis: z.string().trim().max(1000).optional(),
  treatment: z.string().trim().max(1000).optional(),
  prescription: z.string().trim().max(1000).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export type MedicalRecordInput = z.infer<typeof medicalRecordSchema>;
