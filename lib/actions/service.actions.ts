"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { createActionError } from "./action-error";
import { type ActionResult } from "./action-result";
import { wrapAction } from "./action-utils";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { serviceSchema, updateServiceSchema } from "@/lib/validations/service";
import { PAGINATION_CONSTANTS } from "@/lib/constants/pagination";

export type ServiceListItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  isActive: boolean;
};

export async function getServices(params?: {
  page?: number;
  limit?: number;
  search?: string;
  showInactive?: boolean;
}): Promise<ActionResult<{ services: ServiceListItem[]; total: number }>> {
  return wrapAction(async () => {
    await requireAdmin();

    const page = params?.page ?? PAGINATION_CONSTANTS.DEFAULT_PAGE;
    const limit = params?.limit ?? PAGINATION_CONSTANTS.DEFAULT_LIMIT;
    const search = params?.search?.trim() ?? "";
    const showInactive = params?.showInactive ?? false;

    const where: Prisma.ServiceWhereInput = {
      ...(showInactive ? {} : { isActive: true }),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { category: { contains: search } },
            ],
          }
        : {}),
    };

    const total = await prisma.service.count({ where });
    const services = await prisma.service.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * limit,
      take: limit,
      select: { id: true, name: true, category: true, price: true, isActive: true },
    });

    return { services, total };
  });
}

export async function getService(id: string): Promise<ActionResult<{ service: ServiceListItem }>> {
  return wrapAction(async () => {
    await requireAdmin();

    const service = await prisma.service.findUnique({
      where: { id },
      select: { id: true, name: true, category: true, price: true, isActive: true },
    });

    if (!service) {
      throw createActionError("NOT_FOUND", "Service tidak ditemukan", 404);
    }

    return { service };
  });
}

export async function createService(input: unknown): Promise<ActionResult<{ id: string }>> {
  return wrapAction(async () => {
    await requireAdmin();
    const parsed = serviceSchema.parse(input);

    const existing = await prisma.service.findFirst({
      where: { name: { equals: parsed.name } },
      select: { id: true },
    });

    if (existing) {
      throw createActionError("CONFLICT", "Nama service sudah digunakan", 409);
    }

    const created = await prisma.service.create({
      data: {
        name: parsed.name,
        category: parsed.category,
        price: parsed.price,
        isActive: true,
      },
    });

    revalidatePath("/services");
    return { id: created.id };
  });
}

export async function updateService(input: unknown): Promise<ActionResult<{ id: string }>> {
  return wrapAction(async () => {
    await requireAdmin();
    const parsed = updateServiceSchema.parse(input);

    const service = await prisma.service.findUnique({ where: { id: parsed.id } });
    if (!service) {
      throw createActionError("NOT_FOUND", "Service tidak ditemukan", 404);
    }

    const existing = await prisma.service.findFirst({
      where: {
        id: { not: parsed.id },
        name: { equals: parsed.name },
      },
      select: { id: true },
    });

    if (existing) {
      throw createActionError("CONFLICT", "Nama service sudah digunakan", 409);
    }

    const updated = await prisma.service.update({
      where: { id: parsed.id },
      data: {
        name: parsed.name,
        category: parsed.category,
        price: parsed.price,
      },
    });

    revalidatePath("/services");
    return { id: updated.id };
  });
}

export async function disableService(id: string): Promise<ActionResult<{ id: string }>> {
  return wrapAction(async () => {
    await requireAdmin();

    const service = await prisma.service.findUnique({ where: { id }, select: { id: true } });
    if (!service) {
      throw createActionError("NOT_FOUND", "Service tidak ditemukan", 404);
    }

    await prisma.service.update({ where: { id }, data: { isActive: false } });
    revalidatePath("/services");
    return { id };
  });
}

export async function enableService(id: string): Promise<ActionResult<{ id: string }>> {
  return wrapAction(async () => {
    await requireAdmin();

    const service = await prisma.service.findUnique({ where: { id }, select: { id: true } });
    if (!service) {
      throw createActionError("NOT_FOUND", "Service tidak ditemukan", 404);
    }

    await prisma.service.update({ where: { id }, data: { isActive: true } });
    revalidatePath("/services");
    return { id };
  });
}
