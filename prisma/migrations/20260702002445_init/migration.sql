-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "pin_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "failed_login_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "address" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "pets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customer_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "breed" TEXT,
    "birth_date" DATETIME,
    "gender" TEXT NOT NULL,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "pets_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pet_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "scheduled_at" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "complaint" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "appointments_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "appointments_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "medical_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appointment_id" TEXT NOT NULL,
    "vital_sign" TEXT,
    "diagnosis" TEXT,
    "treatment" TEXT,
    "prescription" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "medical_records_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "hotel_rooms" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "room_number" TEXT NOT NULL,
    "room_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "is_active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "pet_hotels" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pet_id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "check_in_date" DATETIME NOT NULL,
    "check_out_date" DATETIME,
    "food" TEXT,
    "feeding_schedule" TEXT,
    "medicine_schedule" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'BOOKED',
    CONSTRAINT "pet_hotels_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "pet_hotels_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "hotel_rooms" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customer_id" TEXT NOT NULL,
    "appointment_id" TEXT,
    "pet_hotel_id" TEXT,
    "total_amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNPAID',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "invoices_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "invoices_pet_hotel_id_fkey" FOREIGN KEY ("pet_hotel_id") REFERENCES "pet_hotels" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoice_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "invoice_items_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "customers_user_id_key" ON "customers"("user_id");

-- CreateIndex
CREATE INDEX "pets_customer_id_idx" ON "pets"("customer_id");

-- CreateIndex
CREATE INDEX "appointments_pet_id_idx" ON "appointments"("pet_id");

-- CreateIndex
CREATE INDEX "appointments_status_idx" ON "appointments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_doctor_id_scheduled_at_key" ON "appointments"("doctor_id", "scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "medical_records_appointment_id_key" ON "medical_records"("appointment_id");

-- CreateIndex
CREATE UNIQUE INDEX "hotel_rooms_room_number_key" ON "hotel_rooms"("room_number");

-- CreateIndex
CREATE INDEX "pet_hotels_pet_id_idx" ON "pet_hotels"("pet_id");

-- CreateIndex
CREATE INDEX "pet_hotels_room_id_idx" ON "pet_hotels"("room_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_appointment_id_key" ON "invoices"("appointment_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_pet_hotel_id_key" ON "invoices"("pet_hotel_id");

-- CreateIndex
CREATE INDEX "invoices_customer_id_idx" ON "invoices"("customer_id");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");
