import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcrypt";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const ownerPinHash = await bcrypt.hash("123456", 10);
  const adminPinHash = await bcrypt.hash("123456", 10);
  const doctorPinHash = await bcrypt.hash("123456", 10);
  const customerPinHash = await bcrypt.hash("123456", 10);

  const owner = await prisma.user.upsert({
    where: { username: "owner" },
    update: {},
    create: {
      username: "owner",
      pinHash: ownerPinHash,
      role: "OWNER",
      name: "Owner Haland",
      phone: "081234567890",
    },
  });

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      pinHash: adminPinHash,
      role: "ADMIN",
      name: "Admin Haland",
      phone: "081234567891",
    },
  });

  const doctor = await prisma.user.upsert({
    where: { username: "dokter" },
    update: {},
    create: {
      username: "dokter",
      pinHash: doctorPinHash,
      role: "DOKTER",
      name: "Dr. Cinta",
      phone: "081234567892",
    },
  });

  const customer = await prisma.user.upsert({
    where: { username: "customer" },
    update: {},
    create: {
      username: "customer",
      pinHash: customerPinHash,
      role: "CUSTOMER",
      name: "Customer Haland",
      phone: "081234567893",
    },
  });

  const customerProfile = await prisma.$transaction(async (tx) => {
    return tx.customer.upsert({
      where: { userId: customer.id },
      update: {},
      create: {
        userId: customer.id,
        address: "Jl. Merdeka No. 1",
      },
    });
  });

  const pet = await prisma.pet.upsert({
    where: { id: "seed-pet-1" },
    update: {},
    create: {
      id: "seed-pet-1",
      customerId: customerProfile.id,
      name: "Milo",
      species: "Cat",
      breed: "Domestic Short Hair",
      gender: "MALE",
      notes: "Seed data",
    },
  });

  await prisma.service.upsert({
    where: { id: "seed-service-1" },
    update: {},
    create: {
      id: "seed-service-1",
      name: "Konsultasi Dokter",
      price: 150000,
      category: "Consultation",
    },
  });

  await prisma.service.upsert({
    where: { id: "seed-service-2" },
    update: {},
    create: {
      id: "seed-service-2",
      name: "Vaksin",
      price: 200000,
      category: "Treatment",
    },
  });

  await prisma.service.upsert({
    where: { id: "seed-service-3" },
    update: {},
    create: {
      id: "seed-service-3",
      name: "Grooming",
      price: 120000,
      category: "Treatment",
    },
  });

  await prisma.service.upsert({
    where: { id: "seed-service-4" },
    update: {},
    create: {
      id: "seed-service-4",
      name: "Kandang per Hari",
      price: 80000,
      category: "Hotel",
    },
  });

  await prisma.hotelRoom.upsert({
    where: { roomNumber: "A01" },
    update: {},
    create: {
      roomNumber: "A01",
      roomType: "Standard",
      status: "AVAILABLE",
    },
  });

  console.log("Seed completed:", {
    owner: owner.id,
    admin: admin.id,
    doctor: doctor.id,
    customer: customer.id,
    pet: pet.id,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
