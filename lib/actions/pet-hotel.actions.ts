"use server";

import { revalidatePath } from "next/cache";
import { createActionError } from "./action-error";
import { type ActionResult } from "./action-result";
import { wrapAction } from "./action-utils";
import { requireAdmin, requireStaff } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { hotelRoomSchema, petHotelSchema, type HotelRoomInput, type PetHotelInput } from "@/lib/validations/pet-hotel";
import { PAGINATION_CONSTANTS } from "@/lib/constants/pagination";
import { Prisma } from "@prisma/client";
import type { PetHotelStatus } from "@prisma/client";
import { z } from "zod";

export type HotelRoomListItem = {
  id: string;
  roomNumber: string;
  roomType: string;
  status: string;
  isActive: boolean;
};

export type PetHotelListItem = {
  id: string;
  petId: string;
  petName: string;
  customerName: string;
  roomId: string;
  roomNumber: string;
  status: string;
  checkInDate: Date;
  checkOutDate: Date | null;
};

export async function getHotelRooms(params?: { page?: number; limit?: number; showInactive?: boolean; search?: string }): Promise<ActionResult<{ rooms: HotelRoomListItem[]; total: number }>> {
  return wrapAction(async () => {
    await requireStaff();

    const page = params?.page ?? PAGINATION_CONSTANTS.DEFAULT_PAGE;
    const limit = params?.limit ?? PAGINATION_CONSTANTS.DEFAULT_LIMIT;
    const showInactive = params?.showInactive ?? false;
    const search = params?.search?.trim() ?? "";

    const where: Prisma.HotelRoomWhereInput = { ...(showInactive ? {} : { isActive: true }) };
    if (search) where.OR = [{ roomNumber: { contains: search } }, { roomType: { contains: search } }];

    const total = await prisma.hotelRoom.count({ where });

    const rooms = await prisma.hotelRoom.findMany({
      where,
      orderBy: { roomNumber: "asc" },
      skip: (page - 1) * limit,
      take: limit,
      select: { id: true, roomNumber: true, roomType: true, status: true, isActive: true },
    });

    const mappedRooms: HotelRoomListItem[] = rooms.map((r) => ({ id: r.id, roomNumber: r.roomNumber, roomType: r.roomType, status: String(r.status), isActive: r.isActive }));
    return { rooms: mappedRooms, total };
  });
}

export async function createHotelRoom(input: unknown): Promise<ActionResult<{ id: string }>> {
  return wrapAction(async () => {
    await requireAdmin();
    const parsed = hotelRoomSchema.parse(input) as HotelRoomInput;

    const exists = await prisma.hotelRoom.findFirst({ where: { roomNumber: parsed.roomNumber } });
    if (exists) throw createActionError("CONFLICT", "Nomor kandang sudah ada", 409);

    const created = await prisma.hotelRoom.create({ data: { roomNumber: parsed.roomNumber, roomType: parsed.roomType, status: parsed.status ?? "AVAILABLE", isActive: true } });
    revalidatePath("/pet-hotel");
    return { id: created.id };
  });
}

export async function updateHotelRoom(input: unknown): Promise<ActionResult<{ id: string }>> {
  return wrapAction(async () => {
    await requireAdmin();
    const parsed = z.object({ id: z.string().trim().min(1), roomNumber: z.string().trim().min(1).optional(), roomType: z.string().trim().min(2).optional(), status: z.enum(["AVAILABLE", "OCCUPIED"]).optional() }).parse(input);

    const room = await prisma.hotelRoom.findUnique({ where: { id: parsed.id } });
    if (!room) throw createActionError("NOT_FOUND", "Kandang tidak ditemukan", 404);

    const updated = await prisma.hotelRoom.update({ where: { id: parsed.id }, data: { roomNumber: parsed.roomNumber ?? room.roomNumber, roomType: parsed.roomType ?? room.roomType, status: parsed.status ?? room.status } });
    revalidatePath("/pet-hotel");
    return { id: updated.id };
  });
}

export async function disableHotelRoom(id: string): Promise<ActionResult<{ id: string }>> {
  return wrapAction(async () => {
    await requireAdmin();
    const room = await prisma.hotelRoom.findUnique({ where: { id } });
    if (!room) throw createActionError("NOT_FOUND", "Kandang tidak ditemukan", 404);
    await prisma.hotelRoom.update({ where: { id }, data: { isActive: false } });
    revalidatePath("/pet-hotel");
    return { id };
  });
}

export async function createPetHotelBooking(input: unknown): Promise<ActionResult<{ id: string }>> {
  return wrapAction(async () => {
    await requireAdmin();
    const parsed = petHotelSchema.parse(input) as PetHotelInput;

    const pet = await prisma.pet.findUnique({ where: { id: parsed.petId }, select: { id: true, isActive: true, customer: { select: { id: true } } } });
    if (!pet || !pet.isActive) throw createActionError("NOT_FOUND", "Pet tidak valid", 404);

    const room = await prisma.hotelRoom.findUnique({ where: { id: parsed.roomId }, select: { id: true, status: true, isActive: true } });
    if (!room || !room.isActive) throw createActionError("NOT_FOUND", "Kandang tidak tersedia", 404);
    if (room.status !== "AVAILABLE") throw createActionError("CONFLICT", "Kandang tidak tersedia", 409);

    const created = await prisma.petHotel.create({ data: { petId: parsed.petId, roomId: parsed.roomId, checkInDate: parsed.checkInDate, checkOutDate: parsed.checkOutDate ?? null, food: parsed.food ?? null, feedingSchedule: parsed.feedingSchedule ?? null, medicineSchedule: parsed.medicineSchedule ?? null, notes: parsed.notes ?? null, status: "BOOKED" } });
    revalidatePath("/pet-hotel");
    return { id: created.id };
  });
}

export async function checkInBooking(id: string): Promise<ActionResult<{ id: string }>> {
  return wrapAction(async () => {
    await requireAdmin();
    const booking = await prisma.petHotel.findUnique({ where: { id } });
    if (!booking) throw createActionError("NOT_FOUND", "Booking tidak ditemukan", 404);
    if (booking.status !== "BOOKED") throw createActionError("CONFLICT", "Booking tidak dapat di-check-in", 409);

    await prisma.$transaction(async (tx) => {
      await tx.petHotel.update({ where: { id }, data: { status: "CHECKED_IN" } });
      await tx.hotelRoom.update({ where: { id: booking.roomId }, data: { status: "OCCUPIED" } });
    });

    revalidatePath("/pet-hotel");
    return { id };
  });
}

export async function checkOutBooking(id: string): Promise<ActionResult<{ id: string }>> {
  return wrapAction(async () => {
    await requireAdmin();
    const booking = await prisma.petHotel.findUnique({ where: { id } });
    if (!booking) throw createActionError("NOT_FOUND", "Booking tidak ditemukan", 404);
    if (!["CHECKED_IN", "STAYING"].includes(booking.status)) throw createActionError("CONFLICT", "Booking tidak dapat di-check-out", 409);

    await prisma.$transaction(async (tx) => {
      await tx.petHotel.update({ where: { id }, data: { status: "CHECKED_OUT", checkOutDate: new Date() } });
      await tx.hotelRoom.update({ where: { id: booking.roomId }, data: { status: "AVAILABLE" } });
    });

    revalidatePath("/pet-hotel");
    return { id };
  });
}

export async function extendBooking(input: unknown): Promise<ActionResult<{ id: string }>> {
  return wrapAction(async () => {
    await requireAdmin();
    const parsed = z.object({ id: z.string().trim().min(1), checkOutDate: z.coerce.date() }).parse(input);
    const booking = await prisma.petHotel.findUnique({ where: { id: parsed.id } });
    if (!booking) throw createActionError("NOT_FOUND", "Booking tidak ditemukan", 404);
    if (booking.status === "CHECKED_OUT" || booking.status === "CANCELLED") throw createActionError("CONFLICT", "Booking tidak dapat diperpanjang", 409);

    const updated = await prisma.petHotel.update({ where: { id: parsed.id }, data: { checkOutDate: parsed.checkOutDate } });
    revalidatePath("/pet-hotel");
    return { id: updated.id };
  });
}

export async function cancelBooking(id: string): Promise<ActionResult<{ id: string }>> {
  return wrapAction(async () => {
    await requireAdmin();
    const booking = await prisma.petHotel.findUnique({ where: { id } });
    if (!booking) throw createActionError("NOT_FOUND", "Booking tidak ditemukan", 404);
    if (booking.status !== "BOOKED") throw createActionError("CONFLICT", "Booking hanya dapat dibatalkan sebelum check-in", 409);

    await prisma.petHotel.update({ where: { id }, data: { status: "CANCELLED" } });
    revalidatePath("/pet-hotel");
    return { id };
  });
}

export async function getPetHotels(params?: { page?: number; limit?: number; search?: string; status?: string }): Promise<ActionResult<{ bookings: PetHotelListItem[]; total: number }>> {
  return wrapAction(async () => {
    await requireStaff();
    const page = params?.page ?? PAGINATION_CONSTANTS.DEFAULT_PAGE;
    const limit = params?.limit ?? PAGINATION_CONSTANTS.DEFAULT_LIMIT;
    const search = params?.search?.trim() ?? "";
    const status = params?.status?.trim() ?? "";
    const statusVal = status ? (status as PetHotelStatus) : undefined;

    const where: Prisma.PetHotelWhereInput = {};
    if (statusVal) where.status = statusVal;
    if (search) where.OR = [{ id: { contains: search } }, { pet: { name: { contains: search } } }, { room: { roomNumber: { contains: search } } }];

    const total = await prisma.petHotel.count({ where });

    const bookings = await prisma.petHotel.findMany({
      where,
      orderBy: { checkInDate: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { pet: { include: { customer: { include: { user: true } } } }, room: true },
    });

    const mapped: PetHotelListItem[] = bookings.map((b) => ({ id: b.id, petId: b.petId, petName: b.pet.name, customerName: b.pet.customer.user.name, roomId: b.roomId, roomNumber: b.room.roomNumber, status: b.status, checkInDate: b.checkInDate, checkOutDate: b.checkOutDate }));

    return { bookings: mapped, total };
  });
}

