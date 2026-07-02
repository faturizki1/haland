"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { createActionError } from "./action-error";
import { type ActionResult } from "./action-result";
import { wrapAction } from "./action-utils";
import { requireAdmin, requireAuth, requireStaff } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { AppointmentStatus, createAppointmentSchema, updateAppointmentStatusSchema } from "@/lib/validations/appointment";
import { PAGINATION_CONSTANTS } from "@/lib/constants/pagination";

export type AppointmentDoctorOption = {
  id: string;
  name: string;
};

export type AppointmentPetOption = {
  id: string;
  name: string;
  customerName: string;
};

export type AppointmentListItem = {
  id: string;
  status: AppointmentStatus;
  scheduledAt: Date;
  complaint: string | null;
  createdAt: Date;
  pet: {
    id: string;
    name: string;
    customer: {
      id: string;
      user: {
        id: string;
        name: string;
      };
    };
  };
  doctor: {
    id: string;
    name: string;
  };
};

export type AppointmentDetail = {
  id: string;
  status: AppointmentStatus;
  scheduledAt: Date;
  complaint: string | null;
  notes: string | null;
  createdAt: Date;
  pet: {
    id: string;
    name: string;
    species: string;
    customer: {
      id: string;
      user: {
        id: string;
        name: string;
        username: string;
        phone: string | null;
      };
    };
  };
  doctor: {
    id: string;
    name: string;
  };
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

export async function getDoctors(): Promise<ActionResult<{ doctors: AppointmentDoctorOption[] }>> {
  return wrapAction(async () => {
    await requireAdmin();

    const doctors = await prisma.user.findMany({
      where: { role: "DOKTER", isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });

    return { doctors };
  });
}

export async function getAppointmentOptions(): Promise<ActionResult<{ doctors: AppointmentDoctorOption[]; pets: AppointmentPetOption[] }>> {
  return wrapAction(async () => {
    await requireAdmin();

    const [doctors, pets] = await Promise.all([
      prisma.user.findMany({
        where: { role: "DOKTER", isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.pet.findMany({
        where: { isActive: true, customer: { user: { isActive: true } } },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          customer: {
            select: {
              user: {
                select: { name: true },
              },
            },
          },
        },
      }),
    ]);

    return {
      doctors,
      pets: pets.map((pet) => ({
        id: pet.id,
        name: pet.name,
        customerName: pet.customer.user.name,
      })),
    };
  });
}

export async function getAppointments(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  doctorId?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<ActionResult<{ appointments: AppointmentListItem[]; total: number }>> {
  return wrapAction(async () => {
    const session = await requireAuth();

    const page = params?.page ?? PAGINATION_CONSTANTS.DEFAULT_PAGE;
    const limit = params?.limit ?? PAGINATION_CONSTANTS.DEFAULT_LIMIT;
    const search = params?.search?.trim() ?? "";
    const status = params?.status?.trim();
    const doctorId = params?.doctorId?.trim() ?? "";
    const dateFromValue = params?.dateFrom?.trim() ?? "";
    const dateToValue = params?.dateTo?.trim() ?? "";

    const where = {} as Prisma.AppointmentWhereInput;

    if (session.user.role === "DOKTER") {
      where.doctorId = session.user.id;
    } else if (doctorId) {
      where.doctorId = doctorId;
    }

    if (session.user.role === "CUSTOMER") {
      where.pet = { customer: { userId: session.user.id } };
    }

    if (status) {
      where.status = status as Prisma.EnumAppointmentStatusFilter<"Appointment">;
    }

    if (dateFromValue || dateToValue) {
      where.scheduledAt = {} as Prisma.DateTimeFilter;
      if (dateFromValue) {
        where.scheduledAt.gte = new Date(dateFromValue);
      }
      if (dateToValue) {
        where.scheduledAt.lte = new Date(dateToValue);
      }
    }

    if (search) {
      where.OR = [
        { complaint: { contains: search } },
        { pet: { name: { contains: search } } },
        { pet: { customer: { user: { name: { contains: search } } } } },
        { doctor: { name: { contains: search } } },
      ];
    }

    const total = await prisma.appointment.count({ where });

    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: { scheduledAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        status: true,
        scheduledAt: true,
        complaint: true,
        createdAt: true,
        pet: {
          select: {
            id: true,
            name: true,
            customer: {
              select: {
                id: true,
                user: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
        doctor: {
          select: { id: true, name: true },
        },
      },
    });

    return { appointments, total };
  });
}

export async function getAppointment(id: string): Promise<ActionResult<{ appointment: AppointmentDetail }>> {
  return wrapAction(async () => {
    const session = await requireAuth();

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        pet: {
          include: {
            customer: {
              include: {
                user: {
                  select: { id: true, name: true, username: true, phone: true },
                },
              },
            },
          },
        },
        doctor: {
          select: { id: true, name: true },
        },
        medicalRecord: true,
      },
    });

    if (!appointment) {
      throw createActionError("NOT_FOUND", "Appointment tidak ditemukan", 404);
    }

    if (session.user.role === "DOKTER" && appointment.doctorId !== session.user.id) {
      throw createActionError("FORBIDDEN", "Anda tidak memiliki akses ke appointment ini", 403);
    }

    if (session.user.role === "CUSTOMER" && appointment.pet.customer.userId !== session.user.id) {
      throw createActionError("FORBIDDEN", "Anda tidak memiliki akses ke appointment ini", 403);
    }

    return { appointment };
  });
}

export async function createAppointment(input: unknown): Promise<ActionResult<{ id: string }>> {
  return wrapAction(async () => {
    await requireAdmin();
    const parsed = createAppointmentSchema.parse(input);

    const pet = await prisma.pet.findUnique({
      where: { id: parsed.petId },
      include: {
        customer: {
          select: {
            user: {
              select: { id: true, isActive: true },
            },
          },
        },
      },
    });

    if (!pet || !pet.isActive || !pet.customer || !pet.customer.user.isActive) {
      throw createActionError("NOT_FOUND", "Pet tidak valid", 404);
    }

    const doctor = await prisma.user.findUnique({
      where: { id: parsed.doctorId },
      select: { id: true, role: true, isActive: true },
    });

    if (!doctor || doctor.role !== "DOKTER" || !doctor.isActive) {
      throw createActionError("NOT_FOUND", "Dokter tidak valid", 404);
    }

    const existing = await prisma.appointment.findFirst({
      where: {
        doctorId: parsed.doctorId,
        scheduledAt: parsed.scheduledAt,
        status: { not: "CANCELLED" },
      },
      select: { id: true },
    });

    if (existing) {
      throw createActionError("CONFLICT", "Dokter sudah memiliki appointment di jam tersebut", 409);
    }

    try {
      const appointment = await prisma.appointment.create({
        data: {
          petId: parsed.petId,
          doctorId: parsed.doctorId,
          scheduledAt: parsed.scheduledAt,
          complaint: parsed.complaint ?? null,
          status: parsed.status ?? undefined,
        },
      });

      revalidatePath("/appointments");
      return { id: appointment.id };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw createActionError("CONFLICT", "Dokter sudah memiliki appointment di jam tersebut", 409);
      }
      throw error;
    }
  });
}

export async function updateAppointmentStatus(input: unknown): Promise<ActionResult<{ id: string }>> {
  return wrapAction(async () => {
    const parsed = updateAppointmentStatusSchema.parse(input);
    const session = await requireStaff();

    const appointment = await prisma.appointment.findUnique({
      where: { id: parsed.id },
      include: {
        pet: {
          select: {
            customer: {
              select: { userId: true },
            },
          },
        },
      },
    });

    if (!appointment) {
      throw createActionError("NOT_FOUND", "Appointment tidak ditemukan", 404);
    }

    if (session.user.role === "DOKTER") {
      if (appointment.doctorId !== session.user.id) {
        throw createActionError("FORBIDDEN", "Anda tidak dapat mengubah appointment dokter lain", 403);
      }

      if (appointment.status === "COMPLETED" || appointment.status === "CANCELLED") {
        throw createActionError("FORBIDDEN", "Appointment tidak dapat diubah", 403);
      }

      if (parsed.status !== "IN_PROGRESS" && parsed.status !== "COMPLETED") {
        throw createActionError("FORBIDDEN", "Dokter hanya dapat mengubah status ke IN_PROGRESS atau COMPLETED", 403);
      }
    }

    await prisma.appointment.update({
      where: { id: parsed.id },
      data: { status: parsed.status },
    });

    revalidatePath("/appointments");
    return { id: parsed.id };
  });
}

export async function cancelAppointment(id: string): Promise<ActionResult<{ id: string }>> {
  return updateAppointmentStatus({ id, status: "CANCELLED" });
}
