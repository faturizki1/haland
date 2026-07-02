import { auth } from "@/lib/auth";
import { getAppointmentOptions, getAppointments } from "@/lib/actions/appointment.actions";
import { redirect } from "next/navigation";
import { PAGINATION_CONSTANTS } from "@/lib/constants/pagination";
import { AppointmentManagementClient } from "./appointment-management-client";

export default async function AppointmentsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const appointmentsResult = await getAppointments({
    page: PAGINATION_CONSTANTS.DEFAULT_PAGE,
    limit: PAGINATION_CONSTANTS.DEFAULT_LIMIT,
    search: "",
    status: "",
    doctorId: "",
    dateFrom: "",
    dateTo: "",
  });

  const isAdminOrOwner = session.user.role === "OWNER" || session.user.role === "ADMIN";
  const optionsResult = isAdminOrOwner ? await getAppointmentOptions() : null;

  if (!appointmentsResult.success) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Appointments</h2>
        <p className="mt-2 text-sm text-slate-600">Gagal memuat appointment.</p>
      </section>
    );
  }

  if (isAdminOrOwner && optionsResult && !optionsResult.success) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Appointments</h2>
        <p className="mt-2 text-sm text-slate-600">Gagal memuat appointment.</p>
      </section>
    );
  }

  const appointments = appointmentsResult.data.appointments;
  const total = appointmentsResult.data.total;
  const doctors = isAdminOrOwner && optionsResult?.success ? optionsResult.data.doctors : [];
  const pets = isAdminOrOwner && optionsResult?.success ? optionsResult.data.pets : [];

  return (
    <AppointmentManagementClient
      initialAppointments={appointments}
      initialTotal={total}
      initialPage={PAGINATION_CONSTANTS.DEFAULT_PAGE}
      initialLimit={PAGINATION_CONSTANTS.DEFAULT_LIMIT}
      initialDoctors={doctors}
      initialPets={pets}
      currentUserRole={session.user.role}
    />
  );
}
