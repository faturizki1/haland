"use server";

import bcrypt from "bcrypt";
import { revalidatePath } from "next/cache";
import { createActionError } from "./action-error";
import { type ActionResult } from "./action-result";
import { wrapAction } from "./action-utils";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { createUserSchema, updateUserSchema, resetPinSchema } from "@/lib/validations/user";

export async function createUser(input: unknown): Promise<ActionResult<{ id: string }>> {
  return wrapAction(async () => {
    const session = await requireRole(["OWNER", "ADMIN"]);

    if (session.user.role === "ADMIN") {
      throw createActionError("FORBIDDEN", "Admin tidak dapat membuat akun Owner atau Admin", 403);
    }

    const parsed = createUserSchema.parse(input);

    const existing = await prisma.user.findUnique({ where: { username: parsed.username } });
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
    const session = await requireRole(["OWNER", "ADMIN"]);
    const parsed = updateUserSchema.parse(input);

    const current = await prisma.user.findUnique({ where: { id: parsed.id } });
    if (!current) {
      throw createActionError("NOT_FOUND", "User tidak ditemukan", 404);
    }

    if (session.user.role === "ADMIN" && current.role === "OWNER") {
      throw createActionError("FORBIDDEN", "Admin tidak dapat mengubah akun Owner", 403);
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
    }

    revalidatePath("/users");
    return { id: updated.id };
  });
}

export async function disableUser(id: string, currentUserId?: string): Promise<ActionResult<{ id: string }>> {
  return wrapAction(async () => {
    const session = await requireRole(["OWNER", "ADMIN"]);

    if (currentUserId && currentUserId === session.user.id) {
      throw createActionError("FORBIDDEN", "Anda tidak dapat menonaktifkan akun sendiri", 403);
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw createActionError("NOT_FOUND", "User tidak ditemukan", 404);
    }

    if (session.user.role === "ADMIN" && user.role === "OWNER") {
      throw createActionError("FORBIDDEN", "Admin tidak dapat menonaktifkan akun Owner", 403);
    }

    await prisma.user.update({ where: { id }, data: { isActive: false } });
    revalidatePath("/users");
    return { id };
  });
}

export async function enableUser(id: string): Promise<ActionResult<{ id: string }>> {
  return wrapAction(async () => {
    await requireRole(["OWNER", "ADMIN"]);

    const user = await prisma.user.findUnique({ where: { id } });
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
    await requireRole(["OWNER", "ADMIN"]);
    const parsed = resetPinSchema.parse({ newPin });

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw createActionError("NOT_FOUND", "User tidak ditemukan", 404);
    }

    const pinHash = await bcrypt.hash(parsed.newPin, 10);
    await prisma.user.update({ where: { id }, data: { pinHash } });
    revalidatePath("/users");
    return { id };
  });
}

export async function getUsers() {
  return wrapAction(async () => {
    await requireRole(["OWNER", "ADMIN"]);
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: { customer: true },
    });
    return users;
  });
}
