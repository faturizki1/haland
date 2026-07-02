"use server";

import bcrypt from "bcrypt";
import { revalidatePath } from "next/cache";
import { createActionError } from "./action-error";
import { type ActionResult } from "./action-result";
import { wrapAction } from "./action-utils";
import { requireOwner } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";
import { createUserSchema, updateUserSchema, resetPinSchema } from "@/lib/validations/user";
import { PAGINATION_CONSTANTS } from "@/lib/constants/pagination";

export async function createUser(input: unknown): Promise<ActionResult<{ id: string }>> {
  return wrapAction(async () => {
    await requireOwner();
    const parsed = createUserSchema.parse(input);

    const existing = await prisma.user.findUnique({ where: { username: parsed.username }, select: { id: true } });
    if (existing) {
      throw createActionError("CONFLICT", "Username sudah digunakan", 409);
    }

    const pinHash = await bcrypt.hash(parsed.pin, 10);
    const created = await prisma.user.create({
      data: {
        username: parsed.username,
        pinHash,
        role: parsed.role,
        name: parsed.name,
        phone: parsed.phone ?? null,
        isActive: true,
      },
    });

    if (parsed.role === "CUSTOMER") {
      await prisma.customer.create({
        data: {
          userId: created.id,
          address: parsed.address ?? null,
        },
      });
    }

    revalidatePath("/users");
    return { id: created.id };
  });
}

export async function updateUser(input: unknown): Promise<ActionResult<{ id: string }>> {
  return wrapAction(async () => {
    await requireOwner();
    const parsed = updateUserSchema.parse(input);

    const current = await prisma.user.findUnique({ where: { id: parsed.id }, select: { role: true } });
    if (!current) {
      throw createActionError("NOT_FOUND", "User tidak ditemukan", 404);
    }

    if (current.role === "OWNER") {
      throw createActionError("FORBIDDEN", "Owner tidak dapat diubah", 403);
    }

    const existing = await prisma.user.findFirst({
      where: {
        username: parsed.username,
        NOT: { id: parsed.id },
      },
    });

    if (existing) {
      throw createActionError("CONFLICT", "Username sudah digunakan", 409);
    }

    const updated = await prisma.user.update({
      where: { id: parsed.id },
      data: {
        username: parsed.username,
        role: parsed.role,
        name: parsed.name,
        phone: parsed.phone ?? null,
      },
    });

    if (parsed.role === "CUSTOMER") {
      const customer = await prisma.customer.findUnique({ where: { userId: updated.id } });
      if (!customer) {
        await prisma.customer.create({ data: { userId: updated.id, address: parsed.address ?? null } });
      } else {
        await prisma.customer.update({ where: { id: customer.id }, data: { address: parsed.address ?? null } });
      }
    } else {
      await prisma.customer.deleteMany({ where: { userId: updated.id } });
    }

    revalidatePath("/users");
    return { id: updated.id };
  });
}

export async function disableUser(id: string, currentUserId?: string): Promise<ActionResult<{ id: string }>> {
  return wrapAction(async () => {
    const session = await requireOwner();

    if (currentUserId && currentUserId === session.user.id) {
      throw createActionError("FORBIDDEN", "Anda tidak dapat menonaktifkan akun sendiri", 403);
    }

    const user = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (!user) {
      throw createActionError("NOT_FOUND", "User tidak ditemukan", 404);
    }

    if (user.role === "OWNER") {
      throw createActionError("FORBIDDEN", "Owner tidak dapat dinonaktifkan", 403);
    }

    await prisma.user.update({ where: { id }, data: { isActive: false } });
    revalidatePath("/users");
    return { id };
  });
}

export async function enableUser(id: string): Promise<ActionResult<{ id: string }>> {
  return wrapAction(async () => {
    await requireOwner();

    const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) {
      throw createActionError("NOT_FOUND", "User tidak ditemukan", 404);
    }

    await prisma.user.update({ where: { id }, data: { isActive: true } });
    revalidatePath("/users");
    return { id };
  });
}

export async function resetUserPin(id: string, newPin: string): Promise<ActionResult<{ id: string }>> {
  return wrapAction(async () => {
    await requireOwner();
    const parsed = resetPinSchema.parse({ newPin });

    const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) {
      throw createActionError("NOT_FOUND", "User tidak ditemukan", 404);
    }

    const pinHash = await bcrypt.hash(parsed.newPin, 10);
    await prisma.user.update({ where: { id }, data: { pinHash } });
    revalidatePath("/users");
    return { id };
  });
}

export async function getUsers(params?: { page?: number; limit?: number; search?: string }) {
  return wrapAction(async () => {
    await requireOwner();

    const page = params?.page ?? PAGINATION_CONSTANTS.DEFAULT_PAGE;
    const limit = params?.limit ?? PAGINATION_CONSTANTS.DEFAULT_LIMIT;
    const search = params?.search?.trim() ?? "";

    const roleSearch = ((): Role | undefined => {
      const upper = search.toUpperCase();
      if (upper === "OWNER" || upper === "ADMIN" || upper === "DOKTER" || upper === "CUSTOMER") {
        return upper as Role;
      }
      return undefined;
    })();

    const where = search
      ? {
          OR: [
            { username: { contains: search, mode: "insensitive" } },
            { name: { contains: search, mode: "insensitive" } },
            ...(roleSearch ? [{ role: roleSearch }] : []),
          ],
        }
      : {};

    const total = await prisma.user.count({ where });
    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        username: true,
        role: true,
        name: true,
        phone: true,
        isActive: true,
        createdAt: true,
        customer: {
          select: {
            id: true,
            address: true,
          },
        },
      },
    });

    return { users, total };
  });
}
