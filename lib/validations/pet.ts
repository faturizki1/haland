import { z } from "zod";

export const petSchema = z.object({
  customerId: z.string().trim().min(1),
  name: z.string().trim().min(2).max(100),
  species: z.string().trim().min(2).max(100),
  breed: z.string().trim().max(100).optional(),
  birthDate: z.coerce.date().optional(),
  gender: z.enum(["MALE", "FEMALE"]),
  notes: z.string().trim().max(1000).optional(),
});

export type PetInput = z.infer<typeof petSchema>;
