import { z } from "zod";

const optionalDate = z.preprocess((value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? undefined : new Date(trimmed);
  }
  return value;
}, z.date().optional());

const optionalNumber = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  return Number(value);
}, z.number().positive().max(1000).optional());

export const basePetSchema = z.object({
  customerId: z.string().trim().min(1),
  name: z.string().trim().min(2).max(100),
  species: z.string().trim().min(2).max(100),
  breed: z.string().trim().max(100).optional(),
  color: z.string().trim().max(100).optional(),
  birthDate: optionalDate,
  weight: optionalNumber,
  microchip: z.string().trim().max(100).optional(),
  gender: z.enum(["MALE", "FEMALE"]),
  notes: z.string().trim().max(1000).optional(),
});

export const createPetSchema = basePetSchema;
export const updatePetSchema = basePetSchema.extend({
  id: z.string().trim().min(1),
});

export type PetInput = z.infer<typeof basePetSchema>;
export type CreatePetInput = z.infer<typeof createPetSchema>;
export type UpdatePetInput = z.infer<typeof updatePetSchema>;
