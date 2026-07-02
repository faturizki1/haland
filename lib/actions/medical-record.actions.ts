"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { createActionError } from "./action-error";
import { type ActionResult } from "./action-result";
import { wrapAction } from "./action-utils";
import { requireStaff, requireDoctor, requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import {
  createMedicalRecordSchema,
  updateMedicalRecordSchema,
  updateMedicalRecordStatusSchema,
  treatmentSchema,
  updateTreatmentSchema,
  medicineSchema,
  updateMedicineSchema,
  vaccineSchema,
} from "@/lib/validations/medical-record";
import { PAGINATION_CONSTANTS } from "@/lib/constants/pagination";
import { weightHistorySchema } from "@/lib/validations/medical-record";
import { updateWeightHistorySchema } from "@/lib/validations/medical-record";
import { z } from "zod";

export type ServiceOption = { id: string; name: string; price: number };
export type MedicineOption = { id: string; name: string; stock: number; price: number };

export type MedicalRecordDoctorOption = { id: string; name: string };
export type MedicalRecordPetOption = { id: string; name: string; customerName: string };

export type MedicalRecordListItem = {
  id: string;
  createdAt: Date;
  appointment: {
    id: string;
    pet: { id: string; name: string; customer: { user: { id: string; name: string } } };
    doctor: { id: string; name: string };
  };
};

export async function getMedicalRecordOptions(): Promise<ActionResult<{ doctors: MedicalRecordDoctorOption[]; pets: MedicalRecordPetOption[]; services: ServiceOption[]; medicines: MedicineOption[] }>> {
  return wrapAction(async () => {
    await requireAdmin();

    const [doctors, pets, services, medicines] = await Promise.all([
      prisma.user.findMany({ where: { role: "DOKTER", isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.pet.findMany({ where: { isActive: true, customer: { user: { isActive: true } } }, orderBy: { name: "asc" }, select: { id: true, name: true, customer: { select: { user: { select: { name: true } } } } } }),
      prisma.service.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, price: true } }),
      prisma.medicine.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, stock: true, price: true } }),
    ]);

    return {
      doctors,
      pets: pets.map((p) => ({ id: p.id, name: p.name, customerName: p.customer.user.name })),
      services,
      medicines,
    };
  });
}

export async function getWeightHistory(petId: string): Promise<ActionResult<{ history: { id: string; weight: number; height: number | null; recordedAt: Date }[] }>> {
  return wrapAction(async () => {
    await requireStaff();

    const history = await prisma.weightHistory.findMany({ where: { petId }, orderBy: { recordedAt: "desc" }, select: { id: true, weight: true, height: true, recordedAt: true } });

    return { history: history.map((h) => ({ id: h.id, weight: h.weight, height: h.height ?? null, recordedAt: h.recordedAt })) };
  });
}

export async function addWeightHistory(input: unknown): Promise<ActionResult<{ id: string }>> {
  return wrapAction(async () => {
    await requireDoctor();
    const parsed = weightHistorySchema.parse(input);

    const created = await prisma.weightHistory.create({ data: { petId: parsed.petId, weight: parsed.weight, height: parsed.height ?? undefined, recordedAt: parsed.recordedAt ? new Date(parsed.recordedAt) : undefined } });

    revalidatePath("/medical-records");
    return { id: created.id };
  });
}

export async function updateWeightHistory(input: unknown): Promise<ActionResult<{ id: string }>> {
  return wrapAction(async () => {
    await requireDoctor();
    const parsed = updateWeightHistorySchema.parse(input);

    const wh = await prisma.weightHistory.findUnique({ where: { id: parsed.id } });
    if (!wh) throw createActionError("NOT_FOUND", "Weight history tidak ditemukan", 404);

    const updated = await prisma.weightHistory.update({ where: { id: parsed.id }, data: { weight: parsed.weight, height: parsed.height ?? undefined, recordedAt: parsed.recordedAt ? new Date(parsed.recordedAt) : undefined } });
    revalidatePath("/medical-records");
    return { id: updated.id };
  });
}

export async function removeWeightHistory(id: string): Promise<ActionResult<{ id: string }>> {
  return wrapAction(async () => {
    await requireDoctor();
    const wh = await prisma.weightHistory.findUnique({ where: { id } });
    if (!wh) throw createActionError("NOT_FOUND", "Weight history tidak ditemukan", 404);
    await prisma.weightHistory.delete({ where: { id } });
    revalidatePath("/medical-records");
    return { id };
  });
}

export async function getMedicalRecords(params?: {
  page?: number;
  limit?: number;
  search?: string;
  doctorId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
}): Promise<ActionResult<{ records: MedicalRecordListItem[]; total: number }>> {
  return wrapAction(async () => {
    await requireStaff();

    const page = params?.page ?? PAGINATION_CONSTANTS.DEFAULT_PAGE;
    const limit = params?.limit ?? PAGINATION_CONSTANTS.DEFAULT_LIMIT;
    const search = params?.search?.trim() ?? "";
    const doctorId = params?.doctorId?.trim() ?? "";
    const dateFrom = params?.dateFrom?.trim() ?? "";
    const dateTo = params?.dateTo?.trim() ?? "";
    const status = params?.status?.trim() ?? "";

    const where: Prisma.MedicalRecordWhereInput = {};
    const appointmentWhere: Prisma.AppointmentWhereInput = {};

    if (doctorId) {
      appointmentWhere.doctorId = doctorId;
    }

    if (status) {
      appointmentWhere.status = status as Prisma.EnumAppointmentStatusFilter<"Appointment"> | undefined;
    }

    if (Object.keys(appointmentWhere).length > 0) {
      where.appointment = appointmentWhere;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {} as Prisma.DateTimeFilter;
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    if (search) {
      const or: Prisma.MedicalRecordWhereInput[] = [
        { id: { contains: search } },
        { appointment: { pet: { customer: { user: { name: { contains: search } } } } } },
        { appointment: { pet: { name: { contains: search } } } },
        { appointment: { doctor: { name: { contains: search } } } },
      ];
      where.OR = or;
    }

    const total = await prisma.medicalRecord.count({ where });

    const records = await prisma.medicalRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        appointment: {
          include: {
            pet: { include: { customer: { include: { user: true } } } },
            doctor: true,
          },
        },
      },
    });

    return { records, total };
  });
}

export async function getMedicalRecord(id: string): Promise<ActionResult<{ record: unknown }>> {
  return wrapAction(async () => {
    await requireStaff();

    const record = await prisma.medicalRecord.findUnique({
      where: { id },
      include: {
        appointment: { include: { pet: { include: { customer: { include: { user: true } } } }, doctor: true } },
        medicalRecordTreatments: { include: { service: true } },
        recordMedicines: { include: { medicine: true } },
        medicalRecordVaccines: true,
      },
    });

    if (!record) {
      throw createActionError("NOT_FOUND", "Medical record tidak ditemukan", 404);
    }

    return { record };
  });
}

export async function createMedicalRecord(input: unknown): Promise<ActionResult<{ id: string }>> {
  return wrapAction(async () => {
    await requireDoctor();
    const parsed = createMedicalRecordSchema.parse(input);

    const appointment = await prisma.appointment.findUnique({ where: { id: parsed.appointmentId }, include: { pet: true, doctor: true } });
    if (!appointment) {
      throw createActionError("NOT_FOUND", "Appointment tidak ditemukan", 404);
    }

    const created = await prisma.medicalRecord.create({
      data: {
        appointmentId: parsed.appointmentId,
        vitalSign: parsed.anamnesis ?? null,
        temperature: parsed.temperature ?? undefined,
        heartRate: parsed.heartRate ?? undefined,
        respiration: parsed.respiration ?? undefined,
        diagnosis: parsed.diagnosis ?? null,
        notes: parsed.notes ?? null,
      },
    });

    if (parsed.weight) {
      await prisma.weightHistory.create({ data: { petId: appointment.petId, weight: parsed.weight, height: parsed.height ?? undefined } });
    }

    revalidatePath("/medical-records");
    return { id: created.id };
  });
}

export async function updateMedicalRecord(input: unknown): Promise<ActionResult<{ id: string }>> {
  return wrapAction(async () => {
    await requireDoctor();
    const parsed = updateMedicalRecordSchema.parse(input);

    const record = await prisma.medicalRecord.findUnique({ where: { id: parsed.id }, include: { appointment: { include: { pet: true } } } });
    if (!record) {
      throw createActionError("NOT_FOUND", "Medical record tidak ditemukan", 404);
    }

    const updated = await prisma.medicalRecord.update({
      where: { id: parsed.id },
      data: {
        vitalSign: parsed.anamnesis ?? null,
        temperature: parsed.temperature ?? undefined,
        heartRate: parsed.heartRate ?? undefined,
        respiration: parsed.respiration ?? undefined,
        diagnosis: parsed.diagnosis ?? null,
        notes: parsed.notes ?? null,
      },
    });

    if (parsed.weight) {
      await prisma.weightHistory.create({ data: { petId: record.appointment.petId, weight: parsed.weight, height: parsed.height ?? undefined } });
    }

    revalidatePath("/medical-records");
    return { id: updated.id };
  });
}

export async function updateMedicalRecordStatus(input: unknown): Promise<ActionResult<{ id: string }>> {
  return wrapAction(async () => {
    const parsed = updateMedicalRecordStatusSchema.parse(input);
    await requireStaff();

    const record = await prisma.medicalRecord.findUnique({ where: { id: parsed.id }, include: { appointment: true, recordMedicines: { include: { medicine: true } } } });
    if (!record) throw createActionError("NOT_FOUND", "Medical record tidak ditemukan", 404);

    // validation of transitions
    const currentStatus = record.appointment.status;
    const nextStatus = parsed.status;
    if (currentStatus === "COMPLETED") {
      throw createActionError("FORBIDDEN", "Medical record sudah selesai", 403);
    }

    // enforce allowed transitions: IN_PROGRESS required before COMPLETED
    if (nextStatus === "COMPLETED" && currentStatus !== "IN_PROGRESS") {
      throw createActionError("FORBIDDEN", "Transisi status tidak valid: harus IN_PROGRESS sebelum COMPLETED", 403);
    }

    if (nextStatus === "IN_PROGRESS" && !["PENDING", "CONFIRMED", "CHECKED_IN"].includes(currentStatus)) {
      throw createActionError("FORBIDDEN", "Transisi ke IN_PROGRESS tidak valid dari status saat ini", 403);
    }

    // only staff can set CANCELLED/COMPLETED; doctors limited in appointment action elsewhere
    await prisma.$transaction(async (tx) => {
      if (nextStatus === "COMPLETED") {
        // deduct medicine stock
        for (const rm of record.recordMedicines) {
          const newStock = rm.medicine.stock - rm.quantity;
          if (newStock < 0) throw createActionError("BAD_REQUEST", "Stok obat tidak cukup", 400);
          await tx.medicine.update({ where: { id: rm.medicine.id }, data: { stock: newStock } });
        }

        // sync appointment status
        await tx.appointment.update({ where: { id: record.appointmentId }, data: { status: "COMPLETED" } });
      }

      if (nextStatus === "CANCELLED") {
        await tx.appointment.update({ where: { id: record.appointmentId }, data: { status: "CANCELLED" } });
      }
    });

    revalidatePath("/medical-records");
    return { id: parsed.id };
  });
}

export async function addTreatment(input: unknown): Promise<ActionResult<{ id: string }>> {
  return wrapAction(async () => {
    await requireDoctor();
    const parsed = treatmentSchema.parse(input);

    const service = await prisma.service.findUnique({ where: { id: parsed.serviceId }, select: { id: true, price: true } });
    if (!service) throw createActionError("NOT_FOUND", "Service tidak ditemukan", 404);

    const subtotal = parsed.quantity * parsed.price;

    const created = await prisma.medicalRecordTreatment.create({ data: { medicalRecordId: parsed.medicalRecordId, serviceId: parsed.serviceId, quantity: parsed.quantity, price: parsed.price, notes: parsed.notes ?? null, subtotal } });
    revalidatePath("/medical-records");
    return { id: created.id };
  });
}

export async function updateTreatment(input: unknown): Promise<ActionResult<{ id: string }>> {
  return wrapAction(async () => {
    await requireDoctor();
    const parsed = updateTreatmentSchema.parse(input);

    const treatment = await prisma.medicalRecordTreatment.findUnique({ where: { id: parsed.id }, include: { medicalRecord: true } });
    if (!treatment) throw createActionError("NOT_FOUND", "Treatment tidak ditemukan", 404);

    const subtotal = parsed.quantity * parsed.price;
    const updated = await prisma.medicalRecordTreatment.update({ where: { id: parsed.id }, data: { quantity: parsed.quantity, price: parsed.price, notes: parsed.notes ?? null, subtotal } });
    revalidatePath("/medical-records");
    return { id: updated.id };
  });
}

export async function removeTreatment(id: string): Promise<ActionResult<{ id: string }>> {
  return wrapAction(async () => {
    await requireDoctor();
    const treatment = await prisma.medicalRecordTreatment.findUnique({ where: { id } });
    if (!treatment) throw createActionError("NOT_FOUND", "Treatment tidak ditemukan", 404);
    await prisma.medicalRecordTreatment.delete({ where: { id } });
    revalidatePath("/medical-records");
    return { id };
  });
}

export async function addMedicine(input: unknown): Promise<ActionResult<{ id: string }>> {
  return wrapAction(async () => {
    await requireDoctor();
    const parsed = medicineSchema.parse(input);

    const med = await prisma.medicine.findUnique({ where: { id: parsed.medicineId }, select: { id: true, stock: true, price: true } });
    if (!med) throw createActionError("NOT_FOUND", "Medicine tidak ditemukan", 404);

    const subtotal = parsed.quantity * parsed.price;

    const created = await prisma.medicalRecordMedicine.create({ data: { medicalRecordId: parsed.medicalRecordId, medicineId: parsed.medicineId, quantity: parsed.quantity, dosage: parsed.dosage ?? null, instruction: parsed.instruction ?? null, price: parsed.price, subtotal } });
    revalidatePath("/medical-records");
    return { id: created.id };
  });
}

export async function updateMedicine(input: unknown): Promise<ActionResult<{ id: string }>> {
  return wrapAction(async () => {
    await requireDoctor();
    const parsed = updateMedicineSchema.parse(input);

    const m = await prisma.medicalRecordMedicine.findUnique({ where: { id: parsed.id } });
    if (!m) throw createActionError("NOT_FOUND", "Medicine record tidak ditemukan", 404);

    const subtotal = parsed.quantity * parsed.price;
    const updated = await prisma.medicalRecordMedicine.update({ where: { id: parsed.id }, data: { quantity: parsed.quantity, dosage: parsed.dosage ?? null, instruction: parsed.instruction ?? null, price: parsed.price, subtotal } });
    revalidatePath("/medical-records");
    return { id: updated.id };
  });
}

export async function removeMedicine(id: string): Promise<ActionResult<{ id: string }>> {
  return wrapAction(async () => {
    await requireDoctor();
    const m = await prisma.medicalRecordMedicine.findUnique({ where: { id } });
    if (!m) throw createActionError("NOT_FOUND", "Medicine record tidak ditemukan", 404);
    await prisma.medicalRecordMedicine.delete({ where: { id } });
    revalidatePath("/medical-records");
    return { id };
  });
}

export async function addVaccine(input: unknown): Promise<ActionResult<{ id: string }>> {
  return wrapAction(async () => {
    await requireDoctor();
    const parsed = vaccineSchema.parse(input);
    const created = await prisma.medicalRecordVaccine.create({ data: { medicalRecordId: parsed.medicalRecordId, vaccine: parsed.vaccine, batch: parsed.batch ?? null, expired: parsed.expired ? new Date(parsed.expired) : null, nextSchedule: parsed.nextSchedule ? new Date(parsed.nextSchedule) : null } });
    revalidatePath("/medical-records");
    return { id: created.id };
  });
}

export async function removeVaccine(id: string): Promise<ActionResult<{ id: string }>> {
  return wrapAction(async () => {
    await requireDoctor();
    const v = await prisma.medicalRecordVaccine.findUnique({ where: { id } });
    if (!v) throw createActionError("NOT_FOUND", "Vaccine record tidak ditemukan", 404);
    await prisma.medicalRecordVaccine.delete({ where: { id } });
    revalidatePath("/medical-records");
    return { id };
  });
}

export async function updateVaccine(input: unknown): Promise<ActionResult<{ id: string }>> {
  return wrapAction(async () => {
    await requireDoctor();
    const parsed = vaccineSchema.extend({ id: z.string().trim().min(1) }).parse(input);

    const v = await prisma.medicalRecordVaccine.findUnique({ where: { id: parsed.id } });
    if (!v) throw createActionError("NOT_FOUND", "Vaccine record tidak ditemukan", 404);

    const updated = await prisma.medicalRecordVaccine.update({ where: { id: parsed.id }, data: { vaccine: parsed.vaccine, batch: parsed.batch ?? null, expired: parsed.expired ? new Date(parsed.expired) : null, nextSchedule: parsed.nextSchedule ? new Date(parsed.nextSchedule) : null } });
    revalidatePath("/medical-records");
    return { id: updated.id };
  });
}

export async function prepareInvoiceForMedicalRecord(id: string): Promise<ActionResult<{ payload: { items: { type: "SERVICE" | "MEDICINE"; refId: string; name: string; quantity: number; price: number; subtotal: number }[]; total: number } }>> {
  return wrapAction(async () => {
    await requireStaff();

    const record = await prisma.medicalRecord.findUnique({ where: { id }, include: { medicalRecordTreatments: { include: { service: true } }, recordMedicines: { include: { medicine: true } } } });
    if (!record) throw createActionError("NOT_FOUND", "Medical record tidak ditemukan", 404);

    const items: { type: "SERVICE" | "MEDICINE"; refId: string; name: string; quantity: number; price: number; subtotal: number }[] = [];

    for (const t of record.medicalRecordTreatments) {
      items.push({ type: "SERVICE", refId: t.serviceId, name: t.service.name, quantity: t.quantity, price: t.price, subtotal: t.subtotal });
    }

    for (const m of record.recordMedicines) {
      items.push({ type: "MEDICINE", refId: m.medicineId, name: m.medicine.name, quantity: m.quantity, price: m.price, subtotal: m.subtotal });
    }

    const total = items.reduce((s, it) => s + it.subtotal, 0);

    return { payload: { items, total } };
  });
}

