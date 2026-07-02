import { auth } from "@/lib/auth";
import { getMedicalRecords, getMedicalRecordOptions } from "@/lib/actions/medical-record.actions";
import { redirect } from "next/navigation";
import { PAGINATION_CONSTANTS } from "@/lib/constants/pagination";
import { MedicalRecordManagementClient } from "./medical-record-management-client";

export default async function MedicalRecordsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const recordsResult = await getMedicalRecords({ page: PAGINATION_CONSTANTS.DEFAULT_PAGE, limit: PAGINATION_CONSTANTS.DEFAULT_LIMIT, search: "", doctorId: "", dateFrom: "", dateTo: "" });

  const isAdminOrOwner = session.user.role === "OWNER" || session.user.role === "ADMIN";
  const optionsResult = isAdminOrOwner ? await getMedicalRecordOptions() : null;

  if (!recordsResult.success) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Medical Records</h2>
        <p className="mt-2 text-sm text-slate-600">Gagal memuat medical records.</p>
      </section>
    );
  }

  if (isAdminOrOwner && optionsResult && !optionsResult.success) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Medical Records</h2>
        <p className="mt-2 text-sm text-slate-600">Gagal memuat opsi filter.</p>
      </section>
    );
  }

  const records = recordsResult.data.records;
  const total = recordsResult.data.total;
  const doctors = isAdminOrOwner && optionsResult?.success ? optionsResult.data.doctors : [];
  const pets = isAdminOrOwner && optionsResult?.success ? optionsResult.data.pets : [];
  const services = isAdminOrOwner && optionsResult?.success ? optionsResult.data.services : [];
  const medicines = isAdminOrOwner && optionsResult?.success ? optionsResult.data.medicines : [];

  return (
    <MedicalRecordManagementClient
      initialRecords={records}
      initialTotal={total}
      initialPage={PAGINATION_CONSTANTS.DEFAULT_PAGE}
      initialLimit={PAGINATION_CONSTANTS.DEFAULT_LIMIT}
      initialDoctors={doctors}
      initialPets={pets}
      initialServices={services}
      initialMedicines={medicines}
      currentUserRole={session.user.role}
    />
  );
}
