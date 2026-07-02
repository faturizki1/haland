"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createAppointment, getAppointments, updateAppointmentStatus, cancelAppointment } from "@/lib/actions/appointment.actions";

export type AppointmentStatus = "PENDING" | "CONFIRMED" | "CHECKED_IN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

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

type DoctorOption = {
  id: string;
  name: string;
};

type PetOption = {
  id: string;
  name: string;
  customerName: string;
};

type Props = {
  initialAppointments: AppointmentListItem[];
  initialTotal: number;
  initialPage: number;
  initialLimit: number;
  initialDoctors: DoctorOption[];
  initialPets: PetOption[];
  currentUserRole: "OWNER" | "ADMIN" | "DOKTER" | "CUSTOMER";
};

type AppointmentDraft = {
  petId: string;
  doctorId: string;
  scheduledAt: string;
  complaint: string;
};

const emptyDraft: AppointmentDraft = {
  petId: "",
  doctorId: "",
  scheduledAt: new Date().toISOString().slice(0, 16),
  complaint: "",
};

const statusOptions: AppointmentStatus[] = ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

function formatDateTimeLocal(value: string) {
  return value;
}

export function AppointmentManagementClient({
  initialAppointments,
  initialTotal,
  initialPage,
  initialLimit,
  initialDoctors,
  initialPets,
  currentUserRole,
}: Props) {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [limit] = useState(initialLimit);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [draft, setDraft] = useState<AppointmentDraft>(emptyDraft);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canManage = currentUserRole === "OWNER" || currentUserRole === "ADMIN";
  const canDoctorUpdate = currentUserRole === "DOKTER";
  const maxPage = Math.max(1, Math.ceil(total / limit));

  const loadAppointments = async (
    pageToLoad: number,
    searchQuery: string,
    status: string,
    doctorId: string,
    fromDate: string,
    toDate: string,
  ) => {
    setError(null);
    setMessage(null);

    const result = await getAppointments({
      page: pageToLoad,
      limit,
      search: searchQuery,
      status: status || undefined,
      doctorId: doctorId || undefined,
      dateFrom: fromDate || undefined,
      dateTo: toDate || undefined,
    });

    if (!result.success) {
      setError(result.error.message);
      return;
    }

    setAppointments(result.data.appointments);
    setTotal(result.data.total);
    setPage(pageToLoad);
  };

  const resetDraft = () => {
    setDraft(emptyDraft);
  };

  const openCreateDialog = () => {
    resetDraft();
    setError(null);
    setMessage(null);
    setIsDialogOpen(true);
  };

  const submitCreateAppointment = () => {
    if (!canManage) {
      setError("Akses tidak cukup untuk membuat appointment.");
      return;
    }

    startTransition(async () => {
      setError(null);
      setMessage(null);

      const result = await createAppointment({
        petId: draft.petId,
        doctorId: draft.doctorId,
        scheduledAt: draft.scheduledAt,
        complaint: draft.complaint || undefined,
      });

      if (!result.success) {
        setError(result.error.message);
        return;
      }

      await loadAppointments(1, search, statusFilter, doctorFilter, dateFrom, dateTo);
      setMessage("Appointment berhasil dibuat.");
      setIsDialogOpen(false);
    });
  };

  const submitUpdateStatus = (id: string, status: AppointmentStatus) => {
    startTransition(async () => {
      setError(null);
      setMessage(null);

      const result = await updateAppointmentStatus({ id, status });
      if (!result.success) {
        setError(result.error.message);
        return;
      }

      await loadAppointments(page, search, statusFilter, doctorFilter, dateFrom, dateTo);
      setMessage(`Status appointment berhasil diubah menjadi ${status}.`);
    });
  };

  const submitCancelAppointment = (id: string) => {
    startTransition(async () => {
      setError(null);
      setMessage(null);

      const result = await cancelAppointment(id);
      if (!result.success) {
        setError(result.error.message);
        return;
      }

      await loadAppointments(page, search, statusFilter, doctorFilter, dateFrom, dateTo);
      setMessage("Appointment berhasil dibatalkan.");
    });
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    startTransition(() => {
      loadAppointments(1, value, statusFilter, doctorFilter, dateFrom, dateTo);
    });
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    startTransition(() => {
      loadAppointments(1, search, value, doctorFilter, dateFrom, dateTo);
    });
  };

  const handleDoctorChange = (value: string) => {
    setDoctorFilter(value);
    startTransition(() => {
      loadAppointments(1, search, statusFilter, value, dateFrom, dateTo);
    });
  };

  const handleDateFromChange = (value: string) => {
    setDateFrom(value);
    startTransition(() => {
      loadAppointments(1, search, statusFilter, doctorFilter, value, dateTo);
    });
  };

  const handleDateToChange = (value: string) => {
    setDateTo(value);
    startTransition(() => {
      loadAppointments(1, search, statusFilter, doctorFilter, dateFrom, value);
    });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > maxPage) {
      return;
    }
    startTransition(() => {
      loadAppointments(newPage, search, statusFilter, doctorFilter, dateFrom, dateTo);
    });
  };

  const renderActions = (appointment: AppointmentListItem) => {
    const actions: ReactNode[] = [];

    if (canManage) {
      if (appointment.status === "PENDING") {
        actions.push(
          <Button key="confirm" size="sm" onClick={() => submitUpdateStatus(appointment.id, "CONFIRMED")}>Konfirmasi</Button>,
          <Button key="cancel" size="sm" variant="outline" onClick={() => submitCancelAppointment(appointment.id)}>Batalkan</Button>,
        );
      }

      if (appointment.status === "CONFIRMED") {
        actions.push(
          <Button key="checkin" size="sm" onClick={() => submitUpdateStatus(appointment.id, "CHECKED_IN")}>Check In</Button>,
          <Button key="cancel" size="sm" variant="outline" onClick={() => submitCancelAppointment(appointment.id)}>Batalkan</Button>,
        );
      }

      if (appointment.status === "CHECKED_IN" || appointment.status === "IN_PROGRESS") {
        actions.push(
          <Button key="complete" size="sm" onClick={() => submitUpdateStatus(appointment.id, "COMPLETED")}>Selesaikan</Button>,
          <Button key="cancel" size="sm" variant="outline" onClick={() => submitCancelAppointment(appointment.id)}>Batalkan</Button>,
        );
      }
    }

    if (canDoctorUpdate) {
      if (appointment.status !== "COMPLETED" && appointment.status !== "CANCELLED") {
        const allowComplete = appointment.status === "IN_PROGRESS" || appointment.status === "CHECKED_IN" || appointment.status === "CONFIRMED" || appointment.status === "PENDING";

        actions.push(
          <Button key="start" size="sm" onClick={() => submitUpdateStatus(appointment.id, "IN_PROGRESS")}>Mulai</Button>,
        );

        if (allowComplete) {
          actions.push(
            <Button key="complete" size="sm" variant="outline" onClick={() => submitUpdateStatus(appointment.id, "COMPLETED")}>Selesai</Button>,
          );
        }
      }
    }

    if (actions.length === 0) {
      return <span className="text-sm text-slate-500">Tidak ada aksi</span>;
    }

    return <div className="flex flex-wrap gap-2">{actions}</div>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Appointment Management</CardTitle>
            <CardDescription>Kelola booking appointment, dokter, dan perubahan status.</CardDescription>
          </div>
          {canManage ? (
            <Dialog open={isDialogOpen} onOpenChange={(value) => { setIsDialogOpen(value); if (!value) resetDraft(); }}>
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog}>Buat Appointment</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tambah Appointment</DialogTitle>
                  <DialogDescription>Isi pet, dokter, tanggal, dan keluhan awal.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Pet</label>
                    <select value={draft.petId} onChange={(e) => setDraft((prev) => ({ ...prev, petId: e.target.value }))} className="w-full rounded-md border border-slate-200 px-3 py-2">
                      <option value="">Pilih pet</option>
                      {initialPets.map((pet) => (
                        <option key={pet.id} value={pet.id}>{pet.name} — {pet.customerName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Dokter</label>
                    <select value={draft.doctorId} onChange={(e) => setDraft((prev) => ({ ...prev, doctorId: e.target.value }))} className="w-full rounded-md border border-slate-200 px-3 py-2">
                      <option value="">Pilih dokter</option>
                      {initialDoctors.map((doctor) => (
                        <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Tanggal & Waktu</label>
                    <input type="datetime-local" value={formatDateTimeLocal(draft.scheduledAt)} onChange={(e) => setDraft((prev) => ({ ...prev, scheduledAt: e.target.value }))} className="w-full rounded-md border border-slate-200 px-3 py-2" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Keluhan</label>
                    <textarea value={draft.complaint} onChange={(e) => setDraft((prev) => ({ ...prev, complaint: e.target.value }))} className="w-full rounded-md border border-slate-200 px-3 py-2" rows={4} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { resetDraft(); setIsDialogOpen(false); }}>Batal</Button>
                  <Button onClick={submitCreateAppointment} disabled={isPending}>Simpan</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : null}
        </CardHeader>

        <CardContent className="space-y-4">
          {message ? <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div> : null}
          {error ? <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
          {isPending ? <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">Memuat data...</div> : null}

          <div className="grid gap-4 sm:grid-cols-3">
            <input value={search} onChange={(e) => handleSearchChange(e.target.value)} placeholder="Cari pet, dokter, atau keluhan..." className="w-full rounded-md border border-slate-200 px-3 py-2 sm:col-span-2" />
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-2 text-sm text-slate-500">
                <span>Status</span>
                <select value={statusFilter} onChange={(e) => handleStatusChange(e.target.value)} className="rounded-md border border-slate-200 px-3 py-2">
                  <option value="">Semua</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {canManage ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Filter Dokter</label>
                <select value={doctorFilter} onChange={(e) => handleDoctorChange(e.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-2">
                  <option value="">Semua dokter</option>
                  {initialDoctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Dari</label>
                <input type="date" value={dateFrom} onChange={(e) => handleDateFromChange(e.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Sampai</label>
                <input type="date" value={dateTo} onChange={(e) => handleDateToChange(e.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-2" />
              </div>
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-700">
                <tr>
                  <th className="px-3 py-2">Pet</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Dokter</th>
                  <th className="px-3 py-2">Tanggal</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Keluhan</th>
                  <th className="px-3 py-2">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {appointments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-slate-500">Belum ada appointment.</td>
                  </tr>
                ) : (
                  appointments.map((appointment) => (
                    <tr key={appointment.id} className="border-t border-slate-200">
                      <td className="px-3 py-2">{appointment.pet.name}</td>
                      <td className="px-3 py-2">{appointment.pet.customer.user.name}</td>
                      <td className="px-3 py-2">{appointment.doctor.name}</td>
                      <td className="px-3 py-2">{new Date(appointment.scheduledAt).toLocaleString("id-ID")}</td>
                      <td className="px-3 py-2">{appointment.status}</td>
                      <td className="px-3 py-2">{appointment.complaint ?? "-"}</td>
                      <td className="px-3 py-2">{renderActions(appointment)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="text-sm text-slate-500">Halaman {page} dari {maxPage}</div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => handlePageChange(page - 1)}>Sebelumnya</Button>
              <Button size="sm" variant="outline" disabled={page >= maxPage} onClick={() => handlePageChange(page + 1)}>Selanjutnya</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
