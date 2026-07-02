"use server";

import type { Gender } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { createActionError } from "./action-error";
import { type ActionResult } from "./action-result";
import { wrapAction } from "./action-utils";
import { requireAdmin, requireStaff } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { createPetSchema, updatePetSchema } from "@/lib/validations/pet";
import { PAGINATION_CONSTANTS } from "@/lib/constants/pagination";

export type PetListItem = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  color: string | null;
  birthDate: Date | null;
  weight: number | null;
  microchip: string | null;
  gender: Gender;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  customer: {
    id: string;
    user: {
      id: string;
      username: string;
      name: string;
      phone: string | null;
    };
  };
};

export type PetOwnerOption = {
  id: string;
  user: {
    id: string;
    username: string;
    name: string;
  };
};

export type PetAppointmentDetail = {
  id: string;
  status: string;
  scheduledAt: Date;
  doctor: { id: string; name: string };
  medicalRecord: {
    id: string;
    vitalSign: string | null;
    diagnosis: string | null;
    treatment: string | null;
    prescription: string | null;
    notes: string | null;
    createdAt: Date;
  } | null;
};

export type PetDetailResponse = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  color: string | null;
  birthDate: Date | null;
  weight: number | null;
  microchip: string | null;
  gender: Gender;
  notes: string | null;
  isActive: boolean;
  customer: {
    id: string;
    address: string | null;
    user: {
      id: string;
      username: string;
      name: string;
      phone: string | null;
    };
  };
  appointments: PetAppointmentDetail[];
};

export async function getPetOwners(): Promise<ActionResult<{ customers: PetOwnerOption[] }>> {
  return wrapAction(async () => {
    await requireAdmin();

    const customers = await prisma.customer.findMany({
      where: { isActive: true, user: { isActive: true } },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        user: {
          select: { id: true, username: true, name: true },
        },
      },
    });

    return { customers };
  });
}

export async function getPets(params?: {
  page?: number;
  limit?: number;
  search?: string;
  species?: string;
  showInactive?: boolean;
}): Promise<ActionResult<{ pets: PetListItem[]; total: number }>> {
  return wrapAction(async () => {
    await requireStaff();

    const page = params?.page ?? PAGINATION_CONSTANTS.DEFAULT_PAGE;
    const limit = params?.limit ?? PAGINATION_CONSTANTS.DEFAULT_LIMIT;
    const search = params?.search?.trim() ?? "";
    const species = params?.species?.trim() ?? "";
    const showInactive = params?.showInactive ?? false;

    const where = {
      ...(showInactive ? {} : { isActive: true }),
      ...(species ? { species: { equals: species, mode: "insensitive" } } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { species: { contains: search, mode: "insensitive" } },
              {
                customer: {
                  user: {
                    name: { contains: search, mode: "insensitive" },
                  },
                },
              },
              {
                appointments: {
                  some: {
                    medicalRecord: {
                      id: { contains: search, mode: "insensitive" },
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const total = await prisma.pet.count({ where });
      const pets = await prisma.pet.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        species: true,
        breed: true,
        color: true,
        birthDate: true,
        weight: true,
        microchip: true,
        gender: true,
        notes: true,
        isActive: true,
        createdAt: true,
        customer: {
          select: {
            id: true,
            user: {
              select: { id: true, username: true, name: true, phone: true },
            },
          },
        },
      },
    });

    return { pets, total };
  });
}

export async function getPet(id: string) {
  return wrapAction(async () => {
    await requireStaff();

    const pet = await prisma.pet.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            address: true,
            user: {
              select: { id: true, username: true, name: true, phone: true },
            },
          },
        },
        appointments: {
          orderBy: { scheduledAt: "desc" },
          include: {
            doctor: { select: { id: true, name: true } },
            medicalRecord: true,
          },
        },
      },
    });

    if (!pet) {
      throw createActionError("NOT_FOUND", "Pet tidak ditemukan", 404);
    }

    return { pet };
  });
}

export async function createPet(input: unknown): Promise<ActionResult<{ id: string }>> {
  return wrapAction(async () => {
    await requireAdmin();
    const parsed = createPetSchema.parse(input);

    const customer = await prisma.customer.findUnique({
      where: { id: parsed.customerId },
      select: { id: true, isActive: true, user: { select: { isActive: true } } },
    });

    if (!customer || !customer.isActive || !customer.user.isActive) {
      throw createActionError("NOT_FOUND", "Customer tidak valid", 404);
    }

    const pet = await prisma.pet.create({
      data: {
        customerId: parsed.customerId,
        name: parsed.name,
        species: parsed.species,
        breed: parsed.breed ?? null,
        color: parsed.color ?? null,
        birthDate: parsed.birthDate ?? null,
        weight: parsed.weight ?? null,
        microchip: parsed.microchip ?? null,
        gender: parsed.gender,
        notes: parsed.notes ?? null,
        isActive: true,
      },
    });

    revalidatePath("/pets");
    return { id: pet.id };
  });
}

export async function updatePet(input: unknown): Promise<ActionResult<{ id: string }>> {
  return wrapAction(async () => {
    await requireAdmin();
    const parsed = updatePetSchema.parse(input);

    const pet = await prisma.pet.findUnique({ where: { id: parsed.id }, select: { id: true } });
    if (!pet) {
      throw createActionError("NOT_FOUND", "Pet tidak ditemukan", 404);
    }

    const customer = await prisma.customer.findUnique({
      where: { id: parsed.customerId },
      select: { id: true, isActive: true, user: { select: { isActive: true } } },
    });

    if (!customer || !customer.isActive || !customer.user.isActive) {
      throw createActionError("NOT_FOUND", "Customer tidak valid", 404);
    }

    await prisma.pet.update({
      where: { id: parsed.id },
      data: {
        customerId: parsed.customerId,
        name: parsed.name,
        species: parsed.species,
        breed: parsed.breed ?? null,
        color: parsed.color ?? null,
        birthDate: parsed.birthDate ?? null,
        weight: parsed.weight ?? null,
        microchip: parsed.microchip ?? null,
        gender: parsed.gender,
        notes: parsed.notes ?? null,
      },
    });

    revalidatePath("/pets");
    return { id: parsed.id };
  });
}

export async function disablePet(id: string): Promise<ActionResult<{ id: string }>> {
  return wrapAction(async () => {
    await requireAdmin();

    const pet = await prisma.pet.findUnique({ where: { id }, select: { id: true } });
    if (!pet) {
      throw createActionError("NOT_FOUND", "Pet tidak ditemukan", 404);
    }

    await prisma.pet.update({ where: { id }, data: { isActive: false } });
    revalidatePath("/pets");
    return { id };
  });
}

export async function enablePet(id: string): Promise<ActionResult<{ id: string }>> {
  return wrapAction(async () => {
    await requireAdmin();

    const pet = await prisma.pet.findUnique({ where: { id }, select: { id: true } });
    if (!pet) {
      throw createActionError("NOT_FOUND", "Pet tidak ditemukan", 404);
    }

    await prisma.pet.update({ where: { id }, data: { isActive: true } });
    revalidatePath("/pets");
    return { id };
  });
}
