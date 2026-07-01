# SPESIFIKASI.md — Haland Petcare
## Sumber Kebenaran Mutlak (Single Source of Truth)

| | |
|---|---|
| **Versi** | 1.1 |
| **Status** | Development |
| **Tipe Sistem** | Single Clinic (bukan SaaS, bukan multi-tenant) |

> Dokumen ini adalah rujukan **tunggal dan mutlak**. Copilot/AI Assistant/Web Builder WAJIB membaca seluruh dokumen ini sebelum menulis kode apapun, dan tidak boleh mengambil keputusan arsitektur di luar yang tertulis di sini. Jika ada kebutuhan yang tidak tercakup, tanyakan dulu — jangan berasumsi, jangan menebak default sendiri.

---

## RIWAYAT PERUBAHAN (CHANGELOG)

| Versi | Perubahan |
|---|---|
| 1.0 | Draf awal. |
| 1.1 | Menutup ambiguitas: strategi hapus data (soft delete), tipe data uang (Int, bukan Decimal), unique constraint invoice & jadwal dokter, standar pagination/list, kode error terstruktur, ganti PIN mandiri, kebijakan kunci rekam medis, void invoice, index database, timezone, lockout login, dan token desain UI dasar. Lihat bagian yang ditandai **[v1.1]**. |

> Setiap penambahan/perubahan berikutnya WAJIB dicatat di tabel ini beserta nomor bagian yang berubah (lihat Rule Absolut #15).

---

## DAFTAR ISI

1. Gambaran Umum
2. Tech Stack
3. Environment Variables
4. Struktur Folder Project
5. Role & Hak Akses (Matrix Lengkap)
6. Authentication & Session
7. Database Schema (Prisma Lengkap)
8. Kontrak Server Actions per Modul
9. Skema Validasi Zod
10. Modul: User Management
11. Modul: Customer & Pet
12. Modul: Appointment
13. Modul: Medical Record
14. Modul: Pet Hotel
15. Modul: Services
16. Modul: Billing & Invoice
17. Modul: Dashboard
18. Modul: Report
19. Modul: Setting
20. Format Response & Error Handling
21. Seed Data Awal
22. Routing & Halaman
23. UI/UX Guidelines
24. Testing Checklist per Role
25. Rule Absolut
26. Target MVP
27. Out of Scope
28. Catatan Deployment
29. Roadmap Implementasi (Referensi Fase)

---

## 1. GAMBARAN UMUM

Haland Petcare adalah sistem manajemen klinik hewan berbasis web untuk **satu klinik hewan tunggal**. Sistem mencakup pendaftaran pelanggan, manajemen data hewan, appointment, pemeriksaan dokter, pet hotel, rekam medis, billing/invoice, laporan, dan setting.

### Prinsip Utama

- Simpel, cepat dikembangkan, tidak ada kompleksitas enterprise.
- Tidak ada multi-tenant / multi-clinic. Tidak ada `clinic_id` di manapun.
- Tidak ada self-registration. Semua akun dibuat oleh internal klinik.
- Login menggunakan **Username + PIN**, bukan email/password.
- Semua mutasi data lewat **Server Actions**, bukan REST API custom.
- Semua input divalidasi dengan **Zod** sebelum menyentuh database.
- Setiap query WAJIB di-scope sesuai role yang login (tidak ada "lupa filter").
- **[v1.1]** Tidak ada hard delete untuk entitas yang punya jejak historis (Customer, Pet, Service) — gunakan soft delete (`isActive`). Lihat bagian 7.2.
- **[v1.1]** Semua nominal uang disimpan sebagai **Integer (Rupiah, tanpa desimal/sen)** — bukan `Decimal`/`Float` — agar konsisten lintas SQLite dan PostgreSQL.
- **[v1.1]** Semua timestamp disimpan sebagai UTC di database (default Prisma), dikonversi ke **WIB (Asia/Jakarta)** hanya di layer presentasi (UI). Tidak ada logika bisnis yang bergantung pada timezone lokal server.

---

## 2. TECH STACK (FIXED — TIDAK BOLEH DIUBAH TANPA PERSETUJUAN)

| Layer | Teknologi | Catatan |
|---|---|---|
| Framework | Next.js 14+ (App Router) | Gunakan Server Components sebisa mungkin, Client Component hanya untuk interaktivitas |
| Bahasa | TypeScript | Strict mode aktif |
| Styling | Tailwind CSS | |
| UI Components | shadcn/ui | Install per-komponen sesuai kebutuhan, jangan install semua sekaligus |
| ORM | Prisma | |
| Database | SQLite (dev) → PostgreSQL (production) | Gunakan `DATABASE_URL` di .env agar migrasi mudah |
| Auth | NextAuth (Auth.js) v5 — Credentials Provider | JWT strategy |
| Validasi | Zod | Definisikan schema di `lib/validations/` |
| Chart | Recharts | Untuk dashboard Owner |
| Hashing PIN | bcrypt | Salt rounds minimal 10 |
| Form Handling | react-hook-form + @hookform/resolvers/zod | Opsional tapi disarankan |
| State Notifikasi UI | shadcn `toast`/`sonner` | Untuk feedback sukses/gagal Server Action |
| Timezone Util | `date-fns-tz` atau `Intl.DateTimeFormat` dengan zona `Asia/Jakarta` | **[v1.1]** Untuk konversi UTC → WIB di layer presentasi |

**Tidak digunakan:**
- REST API custom (`app/api/*` hanya untuk kebutuhan NextAuth callback, bukan untuk CRUD)
- Library multi-tenancy apapun
- Library RBAC generik (role cukup 1 kolom enum di tabel `users`)
- ORM lain selain Prisma
- CSS framework lain selain Tailwind

---

## 3. ENVIRONMENT VARIABLES

Buat file `.env` (dan `.env.example` sebagai template, tanpa nilai rahasia):

```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_SECRET="generate-dengan-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# App
NODE_ENV="development"

# Auth hardening [v1.1]
LOGIN_MAX_ATTEMPTS="5"
LOGIN_LOCKOUT_MINUTES="15"
```

Catatan:
- `NEXTAUTH_SECRET` wajib di-generate unik, jangan dikosongkan.
- Saat migrasi ke PostgreSQL, cukup ganti `DATABASE_URL` dan `provider` di `schema.prisma`, tidak ada perubahan skema logika.
- `LOGIN_MAX_ATTEMPTS` dan `LOGIN_LOCKOUT_MINUTES` mengatur mekanisme lockout login (lihat bagian 6.5). Boleh diberi default hardcoded di kode jika tidak ingin dikonfigurasi via env — yang penting perilakunya konsisten dengan bagian 6.5.

---

## 4. STRUKTUR FOLDER PROJECT

```
haland-petcare/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── users/                # Owner only
│   │   ├── customers/            # Owner, Admin
│   │   ├── pets/                 # Owner, Admin, Customer(own)
│   │   ├── appointments/         # Semua role (scoped)
│   │   ├── medical-records/      # Dokter, Owner(RO), Admin(RO), Customer(RO,own)
│   │   ├── pet-hotel/            # Owner, Admin, Dokter(RO)
│   │   ├── billing/              # Owner, Admin, Customer(RO,own)
│   │   ├── services/             # Owner, Admin
│   │   ├── reports/              # Owner
│   │   ├── settings/             # Owner
│   │   └── profile/              # Semua role — ganti PIN sendiri [v1.1]
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                       # shadcn components
│   ├── layout/                   # Sidebar, Navbar, per-role nav
│   └── forms/                    # Form-form per modul
├── lib/
│   ├── auth.ts                   # NextAuth config
│   ├── prisma.ts                 # Prisma client singleton
│   ├── validations/              # Zod schemas per modul
│   │   ├── user.ts
│   │   ├── customer.ts
│   │   ├── pet.ts
│   │   ├── appointment.ts
│   │   ├── medical-record.ts
│   │   ├── pet-hotel.ts
│   │   ├── service.ts
│   │   ├── invoice.ts
│   │   └── common.ts             # Skema pagination/list bersama [v1.1]
│   ├── actions/                  # Server Actions per modul
│   │   ├── user.actions.ts
│   │   ├── customer.actions.ts
│   │   ├── pet.actions.ts
│   │   ├── appointment.actions.ts
│   │   ├── medical-record.actions.ts
│   │   ├── pet-hotel.actions.ts
│   │   ├── service.actions.ts
│   │   └── invoice.actions.ts
│   ├── auth-guard.ts             # Helper cek role di Server Action
│   ├── format.ts                 # Helper format Rupiah & tanggal WIB [v1.1]
│   └── utils.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── middleware.ts                 # Proteksi route berdasarkan role
├── .env.example
└── spesifikasi.md
```

---

## 5. ROLE & HAK AKSES (MATRIX LENGKAP)

| Fitur / Aksi | OWNER | ADMIN | DOKTER | CUSTOMER |
|---|:---:|:---:|:---:|:---:|
| Login | ✅ | ✅ | ✅ | ✅ |
| Ganti PIN milik sendiri **[v1.1]** | ✅ | ✅ | ✅ | ✅ |
| Buat akun Admin/Dokter | ✅ | ❌ | ❌ | ❌ |
| Buat akun Customer | ✅ | ✅ | ❌ | ❌ |
| Reset PIN user lain (lupa PIN) | ✅ | ❌ | ❌ | ❌ |
| Aktif/nonaktifkan akun | ✅ | ❌ | ❌ | ❌ |
| Registrasi Customer baru | ✅ | ✅ | ❌ | ❌ |
| Registrasi Pet | ✅ | ✅ | ❌ | ❌ (lihat saja) |
| Nonaktifkan (soft delete) Customer/Pet/Service **[v1.1]** | ✅ | ✅ | ❌ | ❌ |
| Lihat semua data pet | ✅ | ✅ | ✅ (pet appointment-nya) | ❌ (hanya milik sendiri) |
| Booking Appointment | ✅ | ✅ | ❌ | ❌ (read-only) |
| Ubah status appointment → IN_PROGRESS/COMPLETED | ✅ (override) | ❌ | ✅ (hanya appointment miliknya) | ❌ |
| Isi/edit Medical Record | ❌ (RO) | ❌ (RO) | ✅ (selama appointment belum COMPLETED) | ❌ (RO, milik sendiri) |
| Booking/Check-in/Check-out Pet Hotel | ✅ | ✅ | ❌ (RO) | ❌ |
| Kelola Services (harga obat/layanan) | ✅ | ✅ | ❌ | ❌ |
| Generate Invoice | ✅ | ✅ | ❌ | ❌ |
| Tandai Invoice PAID | ✅ | ✅ | ❌ | ❌ |
| Batalkan (void) Invoice UNPAID **[v1.1]** | ✅ | ❌ | ❌ | ❌ |
| Lihat Invoice | ✅ (semua) | ✅ (semua) | ❌ | ✅ (milik sendiri) |
| Lihat Report | ✅ | ❌ | ❌ | ❌ |
| Akses Setting | ✅ | ❌ | ❌ | ❌ |

> Catatan: sesuai spesifikasi awal, Admin yang membuat appointment atas nama customer (walk-in/telepon), Customer bersifat read-only untuk appointment. Jika ke depan Customer diberi hak self-booking, ini HARUS diupdate dulu di dokumen ini sebelum diimplementasikan (lihat Rule Absolut #15).

### 5.1 Detail per Role

**OWNER** — Akses penuh ke seluruh sistem.
Menu: Dashboard, User Management, Customer, Pet, Appointment, Medical Record, Pet Hotel, Billing, Services, Report, Setting, Profil.

**ADMIN OPERASIONAL** — Mengelola operasional harian klinik.
Menu: Dashboard, Customer, Pet, Appointment, Pet Hotel, Billing, Services, Profil.
Larangan: Tidak dapat membuat akun Admin maupun Dokter. Tidak dapat membatalkan (void) invoice.

**DOKTER HEWAN**
Menu: Dashboard, Appointment (miliknya), Medical Record, Pet Hotel (View only), Profil.
Larangan: Tidak dapat mengubah pembayaran/billing dalam kondisi apapun. Tidak dapat mengedit medical record milik appointment yang sudah `COMPLETED`.

**CUSTOMER**
Menu: Dashboard, My Pets, Appointment, Pet Hotel, Medical Record (RO), Invoice (RO), Profil.
Larangan: Hanya dapat melihat data miliknya sendiri (scoped by `customer_id` yang terhubung ke `user_id` miliknya). Tidak dapat membuat akun sendiri.

---

## 6. AUTHENTICATION & SESSION

### 6.1 Flow Login

1. User membuka `/login`, input Username + PIN (4-6 digit numerik, ditentukan saat pembuatan akun).
2. Server Action / NextAuth `authorize()` mencari user berdasarkan `username`.
3. Jika ditemukan dan `is_active = true` dan akun tidak sedang terkunci (lihat 6.5), bandingkan PIN dengan `pin_hash` menggunakan `bcrypt.compare`.
4. Jika cocok, buat session JWT berisi: `id`, `username`, `role`, `name`. Reset counter percobaan gagal.
5. Redirect ke `/dashboard` — halaman dashboard membaca `session.user.role` untuk menampilkan widget yang sesuai (lihat bagian 17).
6. Jika gagal (username tidak ada, PIN salah, akun nonaktif, atau akun terkunci), tampilkan pesan error generik: **"Username atau PIN salah"** (jangan bedakan pesan error agar tidak bocor informasi apakah username ada atau tidak — termasuk saat akun sedang terkunci, jangan sebutkan alasan "terkunci" secara eksplisit).

### 6.2 Rule Pembuatan Akun

| Pembuat | Dapat Membuat |
|---|---|
| Owner | Admin Operasional, Dokter |
| Admin Operasional | Customer |
| Customer | — (tidak dapat membuat akun sendiri) |

Saat sebuah akun dibuat:
- Username harus unik (validasi di Zod + constraint database).
- PIN awal di-generate atau diinput manual oleh pembuat akun, langsung di-hash sebelum disimpan — tidak pernah dikirim via email/SMS (karena spesifikasi tidak mencakup notifikasi otomatis). Sampaikan PIN awal secara langsung/manual ke pemilik akun.
- Untuk akun Customer, buat juga baris di tabel `customers` yang terhubung ke `user_id` tersebut dalam satu transaksi (`prisma.$transaction`).

### 6.3 Proteksi Route

Gunakan `middleware.ts` untuk redirect otomatis jika:
- User belum login mengakses halaman `(dashboard)/*` → redirect ke `/login`.
- User login tapi mengakses menu di luar hak rolenya (mis. Customer akses `/users`) → redirect ke `/dashboard` atau halaman 403.

Selain proteksi di middleware (level UI), **setiap Server Action WAJIB melakukan pengecekan role ulang di dalam function-nya** menggunakan helper `lib/auth-guard.ts` — middleware saja tidak cukup karena Server Action bisa dipanggil langsung.

Contoh pola helper:
```ts
// lib/auth-guard.ts
export async function requireRole(allowedRoles: Role[]) {
  const session = await auth();
  if (!session || !allowedRoles.includes(session.user.role)) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}
```

### 6.4 Session Expiry

- JWT session default expiry 7 hari (bisa disesuaikan di `lib/auth.ts`), tidak ada requirement khusus dari spesifikasi awal — gunakan default NextAuth yang wajar untuk aplikasi internal klinik.

### 6.5 Ganti PIN Sendiri & Lockout Login **[v1.1]**

**Ganti PIN sendiri (self-service, beda dengan "Reset PIN" di bagian 6.2 Owner-only):**
- Semua role yang sudah login dapat mengganti PIN miliknya sendiri dari halaman `/profile`.
- Wajib input: PIN lama (diverifikasi via `bcrypt.compare`), PIN baru, konfirmasi PIN baru.
- Jika PIN lama salah, tolak dengan pesan generik **"PIN lama tidak sesuai"**.
- Ini berbeda dari "Reset PIN" (bagian 6.2/10) yang dilakukan Owner untuk user lain **tanpa perlu tahu PIN lama** — dipakai untuk kasus lupa PIN.

**Lockout login (brute-force protection):**
- Sistem menghitung percobaan login gagal per `username` dalam jendela waktu (default `LOGIN_MAX_ATTEMPTS=5` percobaan).
- Setelah melebihi batas, akun tersebut tidak bisa dicoba login lagi selama `LOGIN_LOCKOUT_MINUTES` (default 15 menit), meskipun PIN yang diinput benar.
- Counter direset ke 0 setiap kali login berhasil.
- Implementasi sederhana untuk MVP: simpan `failedLoginCount` dan `lockedUntil` di tabel `users` (lihat bagian 7). Tidak perlu tabel log terpisah.

---

## 7. DATABASE SCHEMA (PRISMA LENGKAP)

> Ini adalah representasi lengkap untuk `schema.prisma`. Semua nama tabel, field, tipe, dan enum di bawah ini bersifat final — jangan menambah/mengurangi tanpa update dokumen ini dulu.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite" // ganti "postgresql" saat production
  url      = env("DATABASE_URL")
}

enum Role {
  OWNER
  ADMIN
  DOKTER
  CUSTOMER
}

enum Gender {
  MALE
  FEMALE
}

enum AppointmentStatus {
  PENDING
  CONFIRMED
  CHECKED_IN
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum HotelRoomStatus {
  AVAILABLE
  OCCUPIED
}

enum PetHotelStatus {
  BOOKED
  CHECKED_IN
  STAYING
  CHECKED_OUT
  CANCELLED
}

enum InvoiceStatus {
  UNPAID
  PAID
  VOID
}

model User {
  id               String    @id @default(cuid())
  username         String    @unique
  pinHash          String    @map("pin_hash")
  role             Role
  name             String
  phone            String?
  isActive         Boolean   @default(true) @map("is_active")
  failedLoginCount Int       @default(0) @map("failed_login_count")
  lockedUntil      DateTime? @map("locked_until")
  createdAt        DateTime  @default(now()) @map("created_at")

  customer           Customer?          // relasi 1-1 jika role = CUSTOMER
  doctorAppointments Appointment[]      @relation("DoctorAppointments")

  @@index([role])
  @@map("users")
}

model Customer {
  id        String   @id @default(cuid())
  userId    String   @unique @map("user_id")
  user      User     @relation(fields: [userId], references: [id])
  address   String?
  isActive  Boolean  @default(true) @map("is_active") // soft delete [v1.1]
  createdAt DateTime @default(now()) @map("created_at")

  pets      Pet[]
  invoices  Invoice[]

  @@map("customers")
}

model Pet {
  id         String    @id @default(cuid())
  customerId String    @map("customer_id")
  customer   Customer  @relation(fields: [customerId], references: [id], onDelete: Restrict)
  name       String
  species    String
  breed      String?
  birthDate  DateTime? @map("birth_date")
  gender     Gender
  notes      String?
  isActive   Boolean   @default(true) @map("is_active") // soft delete [v1.1]

  appointments Appointment[]
  petHotels    PetHotel[]

  @@index([customerId])
  @@map("pets")
}

model Appointment {
  id           String            @id @default(cuid())
  petId        String            @map("pet_id")
  pet          Pet               @relation(fields: [petId], references: [id], onDelete: Restrict)
  doctorId     String            @map("doctor_id")
  doctor       User              @relation("DoctorAppointments", fields: [doctorId], references: [id], onDelete: Restrict)
  scheduledAt  DateTime          @map("scheduled_at")
  status       AppointmentStatus @default(PENDING)
  complaint    String?
  createdAt    DateTime          @default(now()) @map("created_at")

  medicalRecord MedicalRecord?
  invoice       Invoice?

  @@unique([doctorId, scheduledAt]) // cegah dokter double-booking di jam yang sama [v1.1]
  @@index([petId])
  @@index([status])
  @@map("appointments")
}

model MedicalRecord {
  id            String      @id @default(cuid())
  appointmentId String      @unique @map("appointment_id")
  appointment   Appointment @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  vitalSign     String?     @map("vital_sign")
  diagnosis     String?
  treatment     String?
  prescription  String?
  notes         String?
  createdAt     DateTime    @default(now()) @map("created_at")
  updatedAt     DateTime    @updatedAt @map("updated_at")

  @@map("medical_records")
}

model HotelRoom {
  id         String          @id @default(cuid())
  roomNumber String          @unique @map("room_number")
  roomType   String          @map("room_type")
  status     HotelRoomStatus @default(AVAILABLE)
  isActive   Boolean         @default(true) @map("is_active") // soft delete [v1.1]

  petHotels  PetHotel[]

  @@map("hotel_rooms")
}

model PetHotel {
  id                String         @id @default(cuid())
  petId             String         @map("pet_id")
  pet               Pet            @relation(fields: [petId], references: [id], onDelete: Restrict)
  roomId            String         @map("room_id")
  room              HotelRoom      @relation(fields: [roomId], references: [id], onDelete: Restrict)
  checkInDate       DateTime       @map("check_in_date")
  checkOutDate      DateTime?      @map("check_out_date")
  food              String?
  feedingSchedule   String?        @map("feeding_schedule")
  medicineSchedule  String?        @map("medicine_schedule")
  notes             String?
  status            PetHotelStatus @default(BOOKED)

  invoice           Invoice?

  @@index([petId])
  @@index([roomId])
  @@map("pet_hotels")
}

model Service {
  id       String  @id @default(cuid())
  name     String
  price    Int     // Rupiah, tanpa desimal [v1.1]
  category String
  isActive Boolean @default(true) @map("is_active") // soft delete [v1.1]

  invoiceItems InvoiceItem[]

  @@map("services")
}

model Invoice {
  id            String        @id @default(cuid())
  customerId    String        @map("customer_id")
  customer      Customer      @relation(fields: [customerId], references: [id], onDelete: Restrict)
  appointmentId String?       @unique @map("appointment_id") // 1 appointment maksimal 1 invoice [v1.1]
  appointment   Appointment?  @relation(fields: [appointmentId], references: [id])
  petHotelId    String?       @unique @map("pet_hotel_id")   // 1 pet hotel maksimal 1 invoice [v1.1]
  petHotel      PetHotel?     @relation(fields: [petHotelId], references: [id])
  totalAmount   Int           @map("total_amount") // Rupiah, tanpa desimal [v1.1]
  status        InvoiceStatus @default(UNPAID)
  createdAt     DateTime      @default(now()) @map("created_at")

  items InvoiceItem[]

  @@index([customerId])
  @@index([status])
  @@map("invoices")
}

model InvoiceItem {
  id        String  @id @default(cuid())
  invoiceId String  @map("invoice_id")
  invoice   Invoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  serviceId String  @map("service_id")
  service   Service @relation(fields: [serviceId], references: [id], onDelete: Restrict)
  quantity  Int
  price     Int     // snapshot harga saat invoice dibuat, Rupiah tanpa desimal [v1.1]

  @@map("invoice_items")
}
```

### 7.1 Catatan Relasi Penting

- `User.customer` bersifat opsional karena hanya user dengan `role = CUSTOMER` yang punya baris `Customer`.
- `Appointment.doctorId` selalu merujuk ke `User` dengan `role = DOKTER` — validasi ini dilakukan di level aplikasi (Zod + Server Action), bukan di level database, karena Prisma tidak mendukung constraint enum-conditional secara native.
- `MedicalRecord` bersifat 1-1 dengan `Appointment` — satu appointment maksimal punya satu medical record. Jika appointment dihapus (kasus langka), medical record ikut terhapus (`onDelete: Cascade`).
- `Invoice` terhubung ke **tepat satu** `Appointment` **atau** `PetHotel` (nullable keduanya, tapi masing-masing `@unique` — satu appointment/pet hotel maksimal 1 invoice). Validasi "minimal salah satu terisi" tetap dilakukan di level Server Action.
- Semua nominal uang (`Service.price`, `Invoice.totalAmount`, `InvoiceItem.price`) bertipe **`Int`** (Rupiah bulat, tanpa sen) — bukan `Decimal`/`Float`, untuk menghindari isu presisi lintas SQLite/PostgreSQL. Format ke tampilan Rupiah (`Rp 150.000`) dilakukan di layer presentasi via `lib/format.ts`.
- `Appointment` punya `@@unique([doctorId, scheduledAt])` — mencegah dua appointment untuk dokter yang sama persis di jam yang sama. Ini adalah bentuk paling sederhana dari validasi bentrok jadwal untuk MVP (bukan overlap rentang waktu, karena sistem tidak memiliki field durasi appointment).
- Relasi yang menunjuk ke entitas "historis" (Pet, Customer, Service, User dokter) menggunakan `onDelete: Restrict` — mencegah data tersebut dihapus secara hard delete selama masih direferensikan. Karena itu, Customer/Pet/Service/HotelRoom menggunakan pola **soft delete** via kolom `isActive` (lihat 7.2), bukan `DELETE` fisik.

### 7.2 Strategi Hapus Data (Soft Delete) **[v1.1]**

| Entitas | Bisa dihapus fisik? | Mekanisme "hapus" |
|---|---|---|
| User (Admin/Dokter/Customer) | Tidak | `isActive = false` (nonaktifkan akun, sudah ada di v1.0) |
| Customer | Tidak | `isActive = false` — sembunyikan dari list aktif, tapi histori invoice/pet tetap utuh |
| Pet | Tidak | `isActive = false` — mis. hewan sudah almarhum/pindah klinik |
| Service | Tidak | `isActive = false` — harga lama tetap valid untuk invoice historis (karena `InvoiceItem.price` adalah snapshot) |
| HotelRoom | Tidak | `isActive = false` — kamar didekomisi tapi riwayat booking tetap ada |
| Appointment, MedicalRecord, PetHotel, Invoice | Tidak (data transaksi/audit) | Tidak ada mekanisme hapus di MVP; pembatalan dilakukan lewat status (`CANCELLED`/`VOID`) |

Aturan umum: entitas nonaktif (`isActive = false`) **tidak muncul di dropdown/list pilihan baru** (mis. Service nonaktif tidak muncul saat generate invoice baru, Pet nonaktif tidak muncul saat booking appointment baru), tapi tetap muncul apa adanya di data historis yang sudah ada.

---

## 8. KONTRAK SERVER ACTIONS PER MODUL

Semua Server Action mengembalikan bentuk response yang konsisten (lihat bagian 20). Fungsi `list*()` mengikuti standar pagination di bagian 8.1. Berikut daftar minimal function yang harus ada:

### `user.actions.ts`
- `createStaffAccount(data)` — Owner only, buat Admin/Dokter
- `createCustomerAccount(data)` — Owner/Admin, buat Customer + baris Customer
- `resetPin(userId, newPin)` — Owner only (untuk kasus lupa PIN, tanpa perlu PIN lama)
- `changeOwnPin(oldPin, newPin)` — **[v1.1]** semua role yang login, untuk diri sendiri
- `toggleUserActive(userId)` — Owner only
- `listUsers(params: ListParams & { role?: Role })` — Owner only
- `listDoctors()` — **[v1.1]** Owner/Admin, daftar user `role = DOKTER` yang `isActive = true`, dipakai sebagai dropdown saat `createAppointment`

### `customer.actions.ts`
- `createCustomer(data)` — Owner/Admin
- `updateCustomer(id, data)` — Owner/Admin
- `toggleCustomerActive(id)` — **[v1.1]** Owner/Admin, soft delete
- `listCustomers(params: ListParams)` — Owner/Admin
- `getCustomerById(id)` — Owner/Admin, atau Customer untuk dirinya sendiri

### `pet.actions.ts`
- `createPet(data)` — Owner/Admin
- `updatePet(id, data)` — Owner/Admin
- `togglePetActive(id)` — **[v1.1]** Owner/Admin, soft delete
- `listPetsByCustomer(customerId, params: ListParams)` — scoped sesuai role
- `getPetById(id)` — scoped sesuai role

### `appointment.actions.ts`
- `createAppointment(data)` — Admin/Owner. WAJIB menolak jika `(doctorId, scheduledAt)` sudah ada dan status bukan `CANCELLED` (lihat 7 & 12).
- `updateAppointmentStatus(id, status)` — Dokter (hanya miliknya, hanya ke IN_PROGRESS/COMPLETED), Admin/Owner (semua status termasuk CANCELLED/CONFIRMED/CHECKED_IN)
- `listAppointments(params: ListParams & { status?, doctorId?, dateFrom?, dateTo? })` — scoped sesuai role (Dokter: hanya miliknya, Customer: hanya pet miliknya)
- `getAppointmentById(id)` — scoped

### `medical-record.actions.ts`
- `createOrUpdateMedicalRecord(appointmentId, data)` — Dokter only, hanya untuk appointment miliknya sendiri, dan **hanya jika status appointment belum `COMPLETED`** (lihat 13)
- `getMedicalRecordByAppointment(appointmentId)` — scoped sesuai role

### `pet-hotel.actions.ts`
- `createHotelRoom(data)` — Owner/Admin
- `toggleHotelRoomActive(id)` — **[v1.1]** Owner/Admin, soft delete kamar
- `bookPetHotel(data)` — Owner/Admin
- `checkInPetHotel(id)` — Owner/Admin
- `checkOutPetHotel(id)` — Owner/Admin
- `extendStay(id, newCheckOutDate)` — Owner/Admin
- `cancelBooking(id)` — Owner/Admin
- `listPetHotels(params: ListParams & { status? })` — scoped (Dokter: read-only semua)

### `service.actions.ts`
- `createService(data)` — Owner/Admin
- `updateService(id, data)` — Owner/Admin
- `toggleServiceActive(id)` — **[v1.1]** Owner/Admin, soft delete
- `listServices(params: ListParams & { onlyActive?: boolean })` — semua role internal (untuk referensi saat generate invoice, default `onlyActive = true`)

### `invoice.actions.ts`
- `generateInvoiceFromAppointment(appointmentId, items)` — Owner/Admin
- `generateInvoiceFromPetHotel(petHotelId, items)` — Owner/Admin
- `markInvoiceAsPaid(invoiceId)` — Owner/Admin
- `voidInvoice(invoiceId)` — **[v1.1]** Owner only, hanya jika status masih `UNPAID`
- `listInvoices(params: ListParams & { status? })` — scoped (Customer: hanya miliknya)
- `getInvoiceById(id)` — scoped

Setiap function di atas WAJIB diawali pemanggilan `requireRole([...])` dari `lib/auth-guard.ts` sebelum melakukan operasi database.

### 8.1 Standar Pagination & List **[v1.1]**

Semua fungsi `list*()` menerima dan mengembalikan bentuk yang konsisten (didefinisikan di `lib/validations/common.ts`):

```ts
// lib/validations/common.ts
export interface ListParams {
  page?: number;        // default 1
  limit?: number;        // default 10, maksimal 100
  search?: string;        // opsional, pencarian bebas sesuai konteks modul
  sortBy?: string;        // opsional, nama kolom
  sortOrder?: "asc" | "desc"; // default "desc"
}

export interface ListResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
```

`list*()` selalu mengembalikan `ActionResult<ListResult<T>>` (lihat bagian 20). Untuk MVP, implementasi boleh menggunakan pagination client-side di tabel kecil (sesuai bagian 23), tapi kontrak function tetap mengikuti bentuk di atas agar konsisten dan siap di-scale ke server-side pagination tanpa mengubah signature.

---

## 9. SKEMA VALIDASI ZOD

Contoh pola yang harus diikuti untuk semua modul (letakkan di `lib/validations/`):

```ts
// lib/validations/user.ts
import { z } from "zod";

export const createStaffSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  pin: z.string().min(4).max(6).regex(/^[0-9]+$/),
  role: z.enum(["ADMIN", "DOKTER"]),
  name: z.string().min(2).max(100),
  phone: z.string().optional(),
});

export const createCustomerAccountSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  pin: z.string().min(4).max(6).regex(/^[0-9]+$/),
  name: z.string().min(2).max(100),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export const changeOwnPinSchema = z.object({ // [v1.1]
  oldPin: z.string().min(4).max(6).regex(/^[0-9]+$/),
  newPin: z.string().min(4).max(6).regex(/^[0-9]+$/),
});
```

```ts
// lib/validations/common.ts [v1.1]
import { z } from "zod";

export const listParamsSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
```

Pola yang sama diterapkan untuk `pet.ts`, `appointment.ts`, `medical-record.ts`, `pet-hotel.ts`, `service.ts`, `invoice.ts` — sesuai field yang tercantum di bagian 7. Semua Server Action WAJIB memanggil `.parse()` atau `.safeParse()` di awal sebelum eksekusi ke Prisma. Semua field uang (`price`, `totalAmount`) divalidasi sebagai `z.number().int().nonnegative()` (bukan desimal — lihat bagian 7).

---

## 10. MODUL: USER MANAGEMENT

- Halaman `/users` (Owner only): list semua user, filter by role, toggle aktif/nonaktif, tombol reset PIN.
- Form tambah Admin/Dokter: username, PIN awal, nama, no. telp, role (dropdown Admin/Dokter saja).
- Form tambah Customer (bisa juga diakses dari halaman `/customers` oleh Admin): username, PIN awal, nama, no telp, alamat.
- Reset PIN (Owner, untuk user lain yang lupa PIN): input PIN baru, langsung di-hash ulang.
- Halaman `/profile` (semua role): ganti PIN sendiri — input PIN lama + PIN baru (lihat 6.5). **[v1.1]**
- Nonaktifkan akun: `is_active = false` — user tidak bisa login lagi tapi datanya tetap ada (soft delete, bukan hard delete). Jika akun sedang terkunci (lockout), Owner dapat membuka kunci secara manual dengan mereset `failedLoginCount = 0` dan `lockedUntil = null` melalui aksi yang sama dengan reset PIN. **[v1.1]**

---

## 11. MODUL: CUSTOMER & PET

- Halaman `/customers` (Owner/Admin): list (default hanya yang `isActive = true`, dengan filter untuk menampilkan yang nonaktif), search by nama/username, detail customer beserta daftar pet miliknya, tombol nonaktifkan customer. **[v1.1]**
- Halaman `/pets` (Owner/Admin): list semua pet aktif, filter by customer, tombol nonaktifkan pet. **[v1.1]**
- Customer login hanya melihat halaman `/pets` berisi pet miliknya sendiri (query di-filter otomatis via `session.user.id` → `customer.id`).
- Form tambah/edit pet: nama, spesies, ras (opsional), tanggal lahir (opsional), gender, catatan.

---

## 12. MODUL: APPOINTMENT

- Status flow: `PENDING → CONFIRMED → CHECKED_IN → IN_PROGRESS → COMPLETED`, atau `CANCELLED` di titik manapun sebelum `COMPLETED`.
- Halaman `/appointments`:
  - Owner/Admin: lihat semua, buat baru (pilih pet, dokter dari `listDoctors()`, tanggal/jam, keluhan awal), ubah status manapun.
  - Dokter: lihat hanya appointment miliknya (`doctorId = session.user.id`), tombol untuk mulai pemeriksaan (`IN_PROGRESS`) dan selesaikan (`COMPLETED`).
  - Customer: lihat hanya appointment untuk pet miliknya, read-only, tidak ada tombol aksi.
- **Validasi bentrok jadwal (final, wajib — bukan opsional):** sistem menolak pembuatan appointment baru jika kombinasi `(doctorId, scheduledAt)` sudah terpakai oleh appointment lain yang statusnya bukan `CANCELLED`, ditegakkan lewat `@@unique([doctorId, scheduledAt])` di database dan divalidasi ulang di Server Action sebelum insert. **[v1.1]** Sistem tidak memvalidasi rentang durasi (mis. tumpang tindih 30 menit) karena tidak ada field durasi di MVP.

---

## 13. MODUL: MEDICAL RECORD

- Halaman `/medical-records` atau tab di dalam detail appointment yang berstatus `IN_PROGRESS`/`COMPLETED`.
- Dokter mengisi: vital sign, diagnosis, treatment, prescription, notes — hanya untuk appointment miliknya sendiri.
- **Aturan kunci (final):** medical record dapat dibuat/diubah oleh Dokter **selama status appointment belum `COMPLETED`**. Begitu status appointment menjadi `COMPLETED`, medical record terkunci (read-only untuk semua role, termasuk Dokter). Jika ada kesalahan input yang perlu dikoreksi setelah `COMPLETED`, itu di luar cakupan MVP (tidak ada mekanisme "buka kunci"). **[v1.1 — menggantikan kalimat ambigu "atau sesuai kebijakan" di v1.0]**
- Owner/Admin: lihat saja, tidak ada tombol edit.
- Customer: lihat saja, hanya untuk pet miliknya, tidak ada tombol edit.

---

## 14. MODUL: PET HOTEL

- Halaman `/pet-hotel`:
  - Kelola kamar (`hotel_rooms`): Owner/Admin bisa tambah kamar baru dengan nomor & tipe kandang, serta menonaktifkan kamar (`isActive = false`) jika didekomisi. **[v1.1]**
  - Booking: pilih pet, kamar yang `AVAILABLE` dan `isActive = true`, tanggal check-in, catatan makanan/jadwal makan/obat.
  - Check-in: ubah status `BOOKED → CHECKED_IN`, otomatis ubah `hotel_rooms.status → OCCUPIED`.
  - Selama menginap: status `STAYING`.
  - Check-out: ubah status `→ CHECKED_OUT`, otomatis ubah `hotel_rooms.status → AVAILABLE`, isi `check_out_date`.
  - Perpanjang: update `check_out_date` tanpa mengubah status.
  - Cancel: hanya bisa dilakukan sebelum check-in, ubah status `→ CANCELLED`, kamar tetap/kembali `AVAILABLE`.
- Dokter: hanya bisa melihat (view-only), tidak ada tombol aksi apapun di halaman ini.
- Widget dashboard pet hotel: Total Kandang (aktif), Kandang Terisi, Kandang Kosong, Check In Hari Ini, Check Out Hari Ini (dihitung dari query `hotel_rooms` dan `pet_hotels` real-time).

---

## 15. MODUL: SERVICES

- Halaman `/services` (Owner/Admin): CRUD data layanan/obat — nama, harga (Rupiah, integer), kategori (treatment, medicine, hotel, dll), tombol nonaktifkan (soft delete). **[v1.1]**
- List default hanya menampilkan yang `isActive = true`; ada filter untuk menampilkan yang nonaktif (untuk keperluan lihat histori).
- Data ini menjadi referensi dropdown saat generate invoice (`invoice_items`) — hanya Service yang `isActive = true` yang muncul di dropdown.

---

## 16. MODUL: BILLING & INVOICE

- Invoice digenerate manual oleh Owner/Admin dari:
  - Appointment yang sudah `COMPLETED` (pilih service/obat yang dipakai dari daftar `services` aktif, isi quantity, harga otomatis terisi dari `services.price` tapi bisa disesuaikan saat itu — disimpan sebagai snapshot integer di `invoice_items.price`). Satu appointment hanya bisa punya satu invoice (ditegakkan lewat `@@unique`). **[v1.1]**
  - Pet Hotel yang sudah/sedang `CHECKED_OUT` (hitung biaya per hari x jumlah hari menginap, plus service tambahan jika ada). Satu pet hotel booking hanya bisa punya satu invoice. **[v1.1]**
- Setelah invoice dibuat, `status = UNPAID`. Owner/Admin menekan tombol "Tandai Lunas" untuk ubah ke `PAID`.
- **Void invoice:** Owner dapat membatalkan invoice yang masih `UNPAID` (mis. salah generate) — status berubah menjadi `VOID`. Invoice yang sudah `PAID` **tidak dapat** di-void di MVP. Invoice `VOID` tetap tersimpan untuk audit, tidak dihitung sebagai pendapatan. **[v1.1]**
- Dokter: tidak ada akses ke modul ini sama sekali (menu tidak muncul, dan Server Action menolak jika dipanggil).
- Customer: halaman `/invoices` hanya menampilkan invoice miliknya sendiri, read-only, bisa lihat rincian item.

---

## 17. MODUL: DASHBOARD

Widget per role (data real-time dari query database, bukan hardcode):

| Role | Widget |
|---|---|
| **Owner** | Total Customer (aktif), Total Pet (aktif), Appointment Hari Ini, Pet Hotel Hari Ini, Pendapatan Hari Ini, Pendapatan Bulanan (chart Recharts) |
| **Admin** | Appointment Hari Ini, Pet Hotel (ringkasan kamar), Waiting (appointment status PENDING/CONFIRMED), Checked In |
| **Dokter** | Appointment Hari Ini (miliknya), Pemeriksaan Hari Ini (status IN_PROGRESS/COMPLETED miliknya hari ini) |
| **Customer** | Hewan Saya (jumlah pet aktif), Appointment (terdekat/aktif), Pet Hotel (jika sedang menginap), Invoice (jumlah UNPAID) |

Pendapatan dihitung dari `SUM(invoices.total_amount)` dengan filter `status = PAID` (invoice `VOID` dan `UNPAID` tidak dihitung) dan `created_at` sesuai rentang (hari ini/bulan ini), dikonversi ke tanggal WIB sebelum difilter per hari/bulan. **[v1.1]**

---

## 18. MODUL: REPORT

- Halaman `/reports` (Owner only).
- Laporan sederhana (tidak perlu report builder generic):
  - Laporan pendapatan per periode (harian/bulanan), bisa difilter tanggal — hanya invoice `status = PAID`.
  - Laporan jumlah appointment per status.
  - Laporan okupansi pet hotel.
- Tampilkan sebagai tabel + chart Recharts. Tidak perlu export PDF/Excel di MVP kecuali diminta terpisah.

---

## 19. MODUL: SETTING

- Halaman `/settings` (Owner only).
- Minimal berisi: pengaturan info klinik (nama, alamat, no telp — bisa disimpan di tabel `settings` sederhana key-value jika dibutuhkan; jika ditambahkan, WAJIB update bagian 7 dokumen ini dulu).
- Untuk MVP, jika tidak ada kebutuhan konkret, cukup buat halaman placeholder dengan info dasar akun Owner yang login.

---

## 20. FORMAT RESPONSE & ERROR HANDLING

Semua Server Action mengembalikan bentuk konsisten:

```ts
type ErrorCode = // [v1.1]
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "CONFLICT"          // mis. username sudah dipakai, jadwal dokter bentrok
  | "LOCKED"             // akun terkunci karena lockout login
  | "INTERNAL_ERROR";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code: ErrorCode }; // code ditambahkan di v1.1
```

Aturan:
- Jangan `throw` error mentah ke client — selalu tangkap dengan try/catch dan kembalikan `{ success: false, error: "pesan yang aman ditampilkan", code: "..." }`.
- Error validasi Zod: `code: "VALIDATION_ERROR"`, kembalikan pesan field pertama yang gagal, bahasa Indonesia yang jelas.
- Error otorisasi (`requireRole` gagal): `code: "UNAUTHORIZED"`, kembalikan pesan generik **"Anda tidak memiliki akses untuk aksi ini"**, jangan expose detail role yang dibutuhkan.
- Error database (constraint unik, dll): `code: "CONFLICT"` — tangani khusus (mis. username sudah dipakai → pesan **"Username sudah digunakan"**; jadwal dokter bentrok → **"Dokter sudah memiliki appointment di jam tersebut"**).
- Data tidak ditemukan: `code: "NOT_FOUND"`.
- Akun terkunci karena lockout: `code: "LOCKED"` — tetap gunakan pesan generik di layar login (lihat 6.1), `code` ini hanya untuk keperluan internal/logging, bukan ditampilkan verbatim ke user.
- `code` ditujukan untuk kebutuhan internal (logging, testing otomatis, penanganan UI khusus per kasus) — pesan yang tampil ke user tetap `error` dalam Bahasa Indonesia yang ramah.

---

## 21. SEED DATA AWAL

Karena tidak ada self-registration, sistem butuh **satu akun Owner pertama** agar bisa login pertama kali. Buat `prisma/seed.ts`:

- 1 akun Owner: `username: "owner"`, PIN default (mis. `"123456"`, WAJIB diganti setelah first login — gunakan fitur ganti PIN sendiri di 6.5).
- (Opsional untuk memudahkan testing) 1 akun Admin, 1 akun Dokter, 1 akun Customer beserta 1 pet contoh.
- Beberapa `services` contoh (konsultasi, vaksin, grooming, kandang per hari, dst) dengan harga sebagai integer Rupiah (mis. `150000`, bukan `150000.00`). **[v1.1]**
- Beberapa `hotel_rooms` contoh (mis. 5 kandang dengan tipe berbeda).

Jalankan via `npx prisma db seed` (daftarkan script ini di `package.json`).

> Catatan keamanan: PIN default Owner di seed data HARUS diganti segera setelah aplikasi pertama kali dijalankan di lingkungan nyata.

---

## 22. ROUTING & HALAMAN

| Route | Akses | Deskripsi |
|---|---|---|
| `/login` | Publik | Form login Username + PIN |
| `/dashboard` | Semua role (login) | Widget sesuai role |
| `/profile` | Semua role (login) | Info akun + ganti PIN sendiri **[v1.1]** |
| `/users` | Owner | Kelola akun Admin/Dokter/Customer |
| `/customers` | Owner, Admin | List & detail customer |
| `/pets` | Owner, Admin, Customer (scoped) | List & detail pet |
| `/appointments` | Semua role (scoped) | List & aksi sesuai role |
| `/appointments/[id]` | Semua role (scoped) | Detail + medical record terkait |
| `/medical-records` | Dokter, Owner(RO), Admin(RO), Customer(RO, scoped) | Biasanya diakses via detail appointment |
| `/pet-hotel` | Owner, Admin, Dokter(RO) | Booking, check-in/out, status kamar |
| `/services` | Owner, Admin | CRUD layanan/obat |
| `/billing` atau `/invoices` | Owner, Admin, Customer(RO, scoped) | Generate & lihat invoice |
| `/reports` | Owner | Laporan |
| `/settings` | Owner | Pengaturan |

---

## 23. UI/UX GUIDELINES

- Gunakan layout sidebar (kiri) + konten utama, umum untuk dashboard admin — komponen shadcn/ui: `Sidebar` custom, `Card`, `Table`, `Dialog`/`Sheet` untuk form tambah/edit, `Badge` untuk status (warna berbeda per status appointment/invoice/pet hotel), `Toast`/`Sonner` untuk feedback aksi.
- Menu sidebar dirender secara dinamis berdasarkan `session.user.role` — jangan hardcode semua menu lalu disembunyikan dengan CSS (gunakan conditional rendering di server component).
- Warna badge status yang disarankan (konsisten di seluruh app):
  - `PENDING`/`BOOKED`/`UNPAID` → kuning/abu
  - `CONFIRMED`/`CHECKED_IN` → biru
  - `IN_PROGRESS`/`STAYING` → oranye
  - `COMPLETED`/`CHECKED_OUT`/`PAID` → hijau
  - `CANCELLED`/`VOID` → merah **[v1.1]**
- **Token desain dasar (default, boleh disesuaikan sebelum implementasi jika ada preferensi lain — bukan aturan mengikat seperti bagian tech stack):** **[v1.1]**
  - Font: `Inter` (via `next/font`).
  - Warna primer: nuansa teal/emerald (kesan bersih, medis, ramah hewan), mis. `emerald-600` sebagai aksen utama shadcn.
  - Radius komponen: sedang (`rounded-lg` / default shadcn), hindari sudut tajam agar terasa ramah.
- Semua tabel list wajib ada pagination sederhana (bisa client-side untuk MVP karena skala single-clinic tidak besar), mengikuti kontrak `ListParams`/`ListResult` di bagian 8.1.
- Form wajib menampilkan pesan error per-field dari hasil validasi Zod, bukan hanya toast generik.
- Semua tanggal/jam ditampilkan dalam WIB (`Asia/Jakarta`) menggunakan helper `lib/format.ts`, meskipun disimpan sebagai UTC di database. **[v1.1]**
- Semua nominal uang ditampilkan dengan format Rupiah (`Rp 150.000`) menggunakan helper `lib/format.ts`. **[v1.1]**

---

## 24. TESTING CHECKLIST PER ROLE

Setelah implementasi selesai, uji manual berikut untuk tiap role (login satu-satu):

**Owner:**
- [ ] Bisa buat akun Admin, Dokter, Customer
- [ ] Bisa reset PIN & nonaktifkan akun
- [ ] Bisa ganti PIN sendiri dari `/profile`
- [ ] Bisa akses semua menu tanpa terkecuali
- [ ] Bisa void invoice `UNPAID`, tidak bisa void invoice `PAID`
- [ ] Dashboard menampilkan angka yang benar (cocokkan manual dengan data di database), termasuk pendapatan yang mengecualikan invoice `VOID`
- [ ] Bisa menonaktifkan Customer/Pet/Service/HotelRoom dan memastikan data historisnya tetap utuh

**Admin:**
- [ ] Bisa buat akun Customer, TIDAK bisa buat Admin/Dokter (baik dari UI maupun coba panggil Server Action langsung)
- [ ] Bisa registrasi customer & pet
- [ ] Bisa booking appointment & pet hotel
- [ ] Mencoba booking appointment dengan dokter+jam yang sama dengan appointment aktif lain → ditolak dengan pesan bentrok jadwal
- [ ] Bisa generate invoice & tandai PAID
- [ ] TIDAK bisa void invoice (tombol tidak muncul + Server Action ditolak)
- [ ] TIDAK bisa akses `/users`, `/reports`, `/settings`

**Dokter:**
- [ ] Hanya melihat appointment miliknya sendiri, bukan milik dokter lain
- [ ] Bisa isi medical record hanya untuk appointment miliknya, dan hanya selama status belum `COMPLETED`
- [ ] Setelah appointment `COMPLETED`, medical record menjadi read-only meskipun untuk dirinya sendiri
- [ ] TIDAK bisa mengubah status appointment dokter lain
- [ ] TIDAK bisa akses billing/invoice sama sekali (menu tidak muncul + Server Action ditolak)
- [ ] Pet Hotel hanya bisa lihat, tidak ada tombol aksi

**Customer:**
- [ ] Hanya melihat pet, appointment, pet hotel, invoice miliknya sendiri — coba akses ID milik customer lain langsung via URL harus ditolak
- [ ] Tidak ada tombol create/edit di manapun kecuali yang memang diizinkan (ganti PIN sendiri)
- [ ] Tidak bisa membuat akun sendiri (tidak ada halaman register)

**Umum:**
- [ ] Login dengan username/PIN salah → pesan error generik, tidak bocor info
- [ ] Akun nonaktif tidak bisa login
- [ ] 5x percobaan login gagal berturut-turut → akun terkunci sementara, tetap dengan pesan error generik yang sama
- [ ] Semua Server Action yang diuji manual via panggilan langsung (bukan lewat UI) tetap menolak akses tidak sah

---

## 25. RULE ABSOLUT (TIDAK BOLEH DILANGGAR)

1. Tidak ada registrasi mandiri / self-service signup.
2. Tidak ada login menggunakan email — hanya Username + PIN.
3. PIN wajib di-hash (bcrypt), tidak pernah disimpan atau ditampilkan plain text.
4. Hanya OWNER yang dapat membuat akun Admin Operasional dan Dokter.
5. Hanya ADMIN OPERASIONAL yang dapat membuat akun Customer.
6. CUSTOMER tidak dapat membuat akun sendiri.
7. OWNER memiliki akses penuh terhadap seluruh sistem.
8. Reset PIN (tanpa tahu PIN lama), perubahan role, dan penonaktifan akun hanya dapat dilakukan oleh OWNER. Ganti PIN sendiri (dengan PIN lama) dapat dilakukan oleh semua role untuk dirinya sendiri. **[v1.1]**
9. DOKTER tidak dapat mengubah data billing/pembayaran dalam kondisi apapun.
10. CUSTOMER hanya dapat mengakses/melihat data miliknya sendiri (scoped query berdasarkan relasi `user_id` → `customer_id`).
11. Tidak ada `clinic_id` atau struktur multi-tenant di manapun dalam sistem.
12. Semua mutasi data (create/update/delete) menggunakan Next.js Server Actions, bukan REST API custom.
13. Semua input form wajib divalidasi menggunakan Zod sebelum masuk ke database.
14. Setiap Server Action wajib memvalidasi ulang role pengguna di sisi server (`requireRole`), tidak boleh hanya mengandalkan penyembunyian UI/middleware.
15. Tidak boleh ada penambahan tabel, field, enum, atau endpoint di luar yang tercantum di dokumen ini tanpa memperbarui dokumen ini (termasuk Changelog) terlebih dahulu.
16. Customer, Pet, Service, dan HotelRoom tidak boleh dihapus secara fisik (hard delete) — hanya dinonaktifkan (`isActive = false`). **[v1.1]**
17. Semua nominal uang disimpan sebagai `Int` (Rupiah bulat) — tidak boleh menggunakan `Decimal`/`Float`. **[v1.1]**
18. Satu Appointment atau satu PetHotel booking maksimal hanya boleh memiliki satu Invoice. **[v1.1]**
19. Medical Record tidak boleh diubah lagi setelah Appointment terkait berstatus `COMPLETED`. **[v1.1]**
20. Invoice yang sudah berstatus `PAID` tidak boleh diubah statusnya menjadi `VOID` atau `UNPAID`. **[v1.1]**

---

## 26. TARGET MVP (SCOPE TETAP)

1. Login Username + PIN (+ ganti PIN sendiri, lockout)
2. Dashboard (per role)
3. User Management
4. Customer Management
5. Pet Management
6. Appointment Management
7. Medical Record
8. Pet Hotel Management
9. Services Management
10. Billing & Invoice
11. Report
12. Setting

Tidak ada fitur di luar daftar ini yang ditambahkan tanpa update dokumen ini terlebih dahulu. Detail seperti soft delete, lockout login, void invoice, dan standar pagination (v1.1) adalah **penajaman aturan di dalam 12 modul di atas**, bukan modul baru — sehingga tidak melanggar batasan scope ini.

---

## 27. YANG SENGAJA TIDAK ADA DI MVP (OUT OF SCOPE)

- Multi-clinic / SaaS
- Self-registration
- Email/password login
- Notifikasi email/SMS/WhatsApp otomatis
- Payment gateway online
- Mobile app native
- Report builder generic/custom
- Permission granular per-fitur (cukup role-based sederhana)
- Export PDF/Excel otomatis (kecuali diminta terpisah di luar dokumen ini)
- Multi-bahasa (UI Bahasa Indonesia saja)
- Validasi bentrok jadwal berbasis rentang durasi (hanya exact-match jam, lihat bagian 12) **[v1.1]**
- Mekanisme "buka kunci" medical record setelah appointment `COMPLETED` **[v1.1]**

---

## 28. CATATAN DEPLOYMENT

- Dev: SQLite (`file:./dev.db`), cukup untuk development di Codespace.
- Production: migrasi ke PostgreSQL — cukup ubah `provider` di `schema.prisma` dan `DATABASE_URL`, jalankan ulang `prisma migrate deploy`.
- Pastikan `NEXTAUTH_SECRET` di production berbeda dari dev dan disimpan sebagai secret (bukan di-commit ke repo).
- File `.env` WAJIB masuk `.gitignore`. Hanya `.env.example` yang di-commit.
- Karena field uang bertipe `Int` (bukan `Decimal`), tidak ada isu presisi tambahan saat migrasi SQLite → PostgreSQL. **[v1.1]**

---

## 29. ROADMAP IMPLEMENTASI (REFERENSI FASE)

Dokumen ini dipecah menjadi 10 fase implementasi berurutan untuk dieksekusi via Copilot Chat:

1. Setup Project
2. Database Schema
3. Authentication (termasuk ganti PIN sendiri & lockout login — bagian 6.5)
4. User Management
5. Customer & Pet Management (termasuk soft delete — bagian 7.2)
6. Appointment (termasuk validasi bentrok jadwal — bagian 12)
7. Medical Record (termasuk aturan kunci setelah COMPLETED — bagian 13)
8. Pet Hotel
9. Billing & Invoice (termasuk Services, void invoice — bagian 16)
10. Dashboard, Report & Setting

Setiap fase harus merujuk balik ke dokumen ini secara spesifik (nomor bagian terkait) agar implementasi tidak menyimpang dari spesifikasi.

---

**Dokumen ini adalah rujukan utama.** Setiap penambahan fitur, perubahan role, atau perubahan struktur data harus diperbarui di sini dulu (termasuk tabel Changelog di atas) sebelum diimplementasikan di kode.
