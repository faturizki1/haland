import { z } from "zod";

export const medicalRecordStatusEnum = z.enum(["DRAFT", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);

const optionalString = (max = 1000) => z.string().trim().max(max).optional();

export const createMedicalRecordSchema = z.object({
  appointmentId: z.string().trim().min(1),
  anamnesis: optionalString(),
  physicalExam: optionalString(),
  diagnosis: optionalString(),
  prognosis: optionalString(),
  notes: optionalString(),
  temperature: z.number().nonnegative().optional(),
  weight: z.number().nonnegative().optional(),
  height: z.number().nonnegative().optional(),
  heartRate: z.number().int().nonnegative().optional(),
  respiration: z.number().int().nonnegative().optional(),
});

export const updateMedicalRecordSchema = createMedicalRecordSchema.omit({ appointmentId: true }).extend({ id: z.string().trim().min(1) });

export const updateMedicalRecordStatusSchema = z.object({
  id: z.string().trim().min(1),
  status: medicalRecordStatusEnum,
});

export const treatmentSchema = z.object({
  medicalRecordId: z.string().trim().min(1),
  serviceId: z.string().trim().min(1),
  quantity: z.number().int().positive(),
  price: z.number().int().nonnegative(),
  notes: optionalString(500),
});

export const updateTreatmentSchema = treatmentSchema.extend({ id: z.string().trim().min(1) });

export const medicineSchema = z.object({
  medicalRecordId: z.string().trim().min(1),
  medicineId: z.string().trim().min(1),
  quantity: z.number().int().positive(),
  dosage: z.string().trim().max(200).optional(),
  instruction: z.string().trim().max(1000).optional(),
  price: z.number().int().nonnegative(),
});

export const updateMedicineSchema = medicineSchema.extend({ id: z.string().trim().min(1) });

export const vaccineSchema = z.object({
  medicalRecordId: z.string().trim().min(1),
  vaccine: z.string().trim().min(1),
  batch: z.string().trim().max(200).optional(),
  expired: z.string().optional(),
  nextSchedule: z.string().optional(),
});

export type CreateMedicalRecordInput = z.infer<typeof createMedicalRecordSchema>;
export type UpdateMedicalRecordInput = z.infer<typeof updateMedicalRecordSchema>;
export type UpdateMedicalRecordStatusInput = z.infer<typeof updateMedicalRecordStatusSchema>;

export type TreatmentInput = z.infer<typeof treatmentSchema>;
export type MedicineInput = z.infer<typeof medicineSchema>;
export type VaccineInput = z.infer<typeof vaccineSchema>;

export const weightHistorySchema = z.object({
  petId: z.string().trim().min(1),
  weight: z.number().nonnegative(),
  height: z.number().nonnegative().optional(),
  recordedAt: z.string().optional(),
});

export const updateWeightHistorySchema = weightHistorySchema.extend({ id: z.string().trim().min(1) });

export type WeightHistoryInput = z.infer<typeof weightHistorySchema>;

export type MedicalRecordStatus = z.infer<typeof medicalRecordStatusEnum>;

