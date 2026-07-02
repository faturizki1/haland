"use server";

import bcrypt from "bcrypt";
import { revalidatePath } from "next/cache";

import { createActionError } from "./action-error";
import { type ActionResult } from "./action-result";
import { wrapAction } from "./action-utils";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { createCustomerSchema } from "@/lib/validations/customer";
import { PAGINATION_CONSTANTS } from "@/lib/constants/pagination";

export async function createCustomer(input: unknown): Promise<ActionResult<{ id: string }>> {
  return wrapAction(async () => {
    await requireAdmin();
    const parsed = createCustomerSchema.parse(input);

    const existing = await prisma.user.findUnique({
      where: { username: parsed.username },
      select: { id: true },
    });

    if (existing) {
      throw createActionError("CONFLICT", "Username sudah digunakan", 409);
    }

    const pinHash = await bcrypt.hash(parsed.pin, 10);

    const customer = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: parsed.username,
          pinHash,
          role: "CUSTOMER",
          name: parsed.name,
          phone: parsed.phone ?? null,
          isActive: true,
        },
      });

      return tx.customer.create({
        data: {
          userId: user.id,
          address: parsed.address ?? null,
          isActive: true,
        },
      });
    });

    revalidatePath("/customers");
    return { id: customer.id };
  });
}

export async function getCustomers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  showInactive?: boolean;
}) {
  return wrapAction(async () => {
    await requireAdmin();

    const page = params?.page ?? PAGINATION_CONSTANTS.DEFAULT_PAGE;
    const limit = params?.limit ?? PAGINATION_CONSTANTS.DEFAULT_LIMIT;
    const search = params?.search?.trim() ?? "";
    const showInactive = params?.showInactive ?? false;

    const where = {
      ...(showInactive ? {} : { isActive: true }),
      user: search
        ? {
            OR: [
              { username: { contains: search, mode: "insensitive" } },
              { name: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
    };

    const total = await prisma.customer.count({ where });
    const customers = await prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: { id: true, username: true, name: true, phone: true, isActive: true },
        },
        pets: {
          select: { id: true, name: true, species: true, gender: true, isActive: true },
        },
      },
    });

    return { customers, total };
  });
}

export async function disableCustomer(id: string): Promise<ActionResult<{ id: string }>> {
  return wrapAction(async () => {
    await requireAdmin();

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: { user: { select: { id: true } } },
    });

    if (!customer) {
      throw createActionError("NOT_FOUND", "Customer tidak ditemukan", 404);
    }

    await prisma.$transaction([
      prisma.customer.update({ where: { id }, data: { isActive: false } }),
      prisma.user.update({ where: { id: customer.user.id }, data: { isActive: false } }),
    ]);

    revalidatePath("/customers");
    return { id };
  });
}
