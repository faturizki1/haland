import { z } from "zod";

export const hotelRoomSchema = z.object({
  roomNumber: z.string().trim().min(1).max(20),
  roomType: z.string().trim().min(2).max(100),
  status: z.enum(["AVAILABLE", "OCCUPIED"]).optional(),
});

export const petHotelSchema = z.object({
  petId: z.string().trim().min(1),
  roomId: z.string().trim().min(1),
  checkInDate: z.coerce.date(),
  checkOutDate: z.coerce.date().optional(),
  food: z.string().trim().max(500).optional(),
  feedingSchedule: z.string().trim().max(500).optional(),
  medicineSchedule: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export type HotelRoomInput = z.infer<typeof hotelRoomSchema>;
export type PetHotelInput = z.infer<typeof petHotelSchema>;
