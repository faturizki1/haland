"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getMedicalRecords, getMedicalRecord, getWeightHistory, addWeightHistory, createMedicalRecord, addTreatment, addMedicine, addVaccine, updateTreatment, removeTreatment, updateMedicine, removeMedicine, updateVaccine, removeVaccine, updateWeightHistory, removeWeightHistory, prepareInvoiceForMedicalRecord, updateMedicalRecord } from "@/lib/actions/medical-record.actions";
import { createMedicalRecordSchema, treatmentSchema, medicineSchema, vaccineSchema, UpdateMedicalRecordInput } from "@/lib/validations/medical-record";

type DoctorOption = { id: string; name: string };
type PetOption = { id: string; name: string; customerName: string };

type MedicalRecordListItem = {
  id: string;
  createdAt: string | Date;
  appointment: {
    id: string;
    pet: { id: string; name: string; customer: { user: { id: string; name: string } } };
    doctor: { id: string; name: string };
  };
};

type Props = {
  initialRecords: MedicalRecordListItem[];
  initialTotal: number;
  initialPage: number;
  initialLimit: number;
  initialDoctors: DoctorOption[];
  initialPets: PetOption[];
  initialServices: { id: string; name: string; price: number }[];
  initialMedicines: { id: string; name: string; stock: number; price: number }[];
  currentUserRole: "OWNER" | "ADMIN" | "DOKTER" | "CUSTOMER";
};

export function MedicalRecordManagementClient({ initialRecords, initialTotal, initialPage, initialLimit, initialDoctors, initialPets, initialServices, initialMedicines, currentUserRole }: Props) {
  const [records, setRecords] = useState<MedicalRecordListItem[]>(initialRecords);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [limit] = useState(initialLimit);
  const [search, setSearch] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("");
  const [petFilter, setPetFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const maxPage = Math.max(1, Math.ceil(total / limit));
  const canManage = currentUserRole === "OWNER" || currentUserRole === "ADMIN" || currentUserRole === "DOKTER";

  const loadRecords = async (pageToLoad: number) => {
    setError(null);
    const result = await getMedicalRecords({ page: pageToLoad, limit, search: search || undefined, doctorId: doctorFilter || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined });
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setRecords(result.data.records as MedicalRecordListItem[]);
    setTotal(result.data.total);
    setPage(pageToLoad);
  };

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState({ appointmentId: "", anamnesis: "", physicalExam: "", diagnosis: "", temperature: "", weight: "", heartRate: "", respiration: "", notes: "" });

  const submitCreate = () => {
    startTransition(async () => {
      try {
        const parsed = createMedicalRecordSchema.parse({ appointmentId: createDraft.appointmentId, anamnesis: createDraft.anamnesis || undefined, physicalExam: createDraft.physicalExam || undefined, diagnosis: createDraft.diagnosis || undefined, temperature: createDraft.temperature ? Number(createDraft.temperature) : undefined, weight: createDraft.weight ? Number(createDraft.weight) : undefined, heartRate: createDraft.heartRate ? Number(createDraft.heartRate) : undefined, respiration: createDraft.respiration ? Number(createDraft.respiration) : undefined, notes: createDraft.notes || undefined });
        const res = await createMedicalRecord(parsed);
        if (!res.success) {
          setError(res.error.message);
          return;
        }
        setMessage("Medical record berhasil dibuat.");
        setIsCreateOpen(false);
        await loadRecords(1);
      } catch (err: unknown) {
        if (err instanceof Error) setError(err.message);
      }
    });
  };

  const openDetail = (id: string) => {
    setSelectedRecordId(id);
    setIsDetailOpen(true);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    startTransition(() => {
      loadRecords(1);
    });
  };

  const handleFilterChange = (cb: () => void) => {
    cb();
    startTransition(() => {
      loadRecords(1);
    });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > maxPage) return;
    startTransition(() => {
      loadRecords(newPage);
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Medical Records</CardTitle>
            <CardDescription>Kelola medical record pasien dan riwayatnya.</CardDescription>
          </div>
          {canManage ? (
            <div className="flex items-center gap-2">
              <Button onClick={() => loadRecords(1)}>Refresh</Button>
              <Dialog open={isCreateOpen} onOpenChange={(v) => setIsCreateOpen(v)}>
                <DialogTrigger asChild>
                  <Button>Tambah Medical Record</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Tambah Medical Record</DialogTitle>
                    <DialogDescription>Isi data medical record sesuai form.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 py-2">
                    <div>
                      <label className="block text-sm">Appointment ID</label>
                      <input value={createDraft.appointmentId} onChange={(e) => setCreateDraft((p) => ({ ...p, appointmentId: e.target.value }))} className="w-full rounded-md border px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm">Complaint / Anamnesis</label>
                      <textarea value={createDraft.anamnesis} onChange={(e) => setCreateDraft((p) => ({ ...p, anamnesis: e.target.value }))} className="w-full rounded-md border px-3 py-2" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm">Diagnosis</label>
                        <input value={createDraft.diagnosis} onChange={(e) => setCreateDraft((p) => ({ ...p, diagnosis: e.target.value }))} className="w-full rounded-md border px-3 py-2" />
                      </div>
                      <div>
                        <label className="block text-sm">Physical Exam</label>
                        <input value={createDraft.physicalExam} onChange={(e) => setCreateDraft((p) => ({ ...p, physicalExam: e.target.value }))} className="w-full rounded-md border px-3 py-2" />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <input placeholder="Temperature" value={createDraft.temperature} onChange={(e) => setCreateDraft((p) => ({ ...p, temperature: e.target.value }))} className="rounded-md border px-3 py-2" />
                      <input placeholder="Weight (kg)" value={createDraft.weight} onChange={(e) => setCreateDraft((p) => ({ ...p, weight: e.target.value }))} className="rounded-md border px-3 py-2" />
                      <input placeholder="Heart Rate" value={createDraft.heartRate} onChange={(e) => setCreateDraft((p) => ({ ...p, heartRate: e.target.value }))} className="rounded-md border px-3 py-2" />
                      <input placeholder="Respiration" value={createDraft.respiration} onChange={(e) => setCreateDraft((p) => ({ ...p, respiration: e.target.value }))} className="rounded-md border px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm">Notes</label>
                      <textarea value={createDraft.notes} onChange={(e) => setCreateDraft((p) => ({ ...p, notes: e.target.value }))} className="w-full rounded-md border px-3 py-2" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Batal</Button>
                    <Button onClick={submitCreate} disabled={isPending}>Simpan</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          ) : null}
        </CardHeader>

        <CardContent className="space-y-4">
          {message ? <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div> : null}
          {error ? <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
          {isPending ? <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">Memuat data...</div> : null}

          <div className="grid gap-4 sm:grid-cols-3">
            <input value={search} onChange={(e) => handleSearchChange(e.target.value)} placeholder="Cari pet, dokter, atau ID..." className="w-full rounded-md border border-slate-200 px-3 py-2 sm:col-span-2" />
            <div className="flex items-center gap-2">
              <select value={doctorFilter} onChange={(e) => handleFilterChange(() => setDoctorFilter(e.target.value))} className="rounded-md border border-slate-200 px-3 py-2">
                <option value="">Semua dokter</option>
                {initialDoctors.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Filter Pet</label>
              <select value={petFilter} onChange={(e) => handleFilterChange(() => setPetFilter(e.target.value))} className="w-full rounded-md border border-slate-200 px-3 py-2">
                <option value="">Semua pet</option>
                {initialPets.map((p) => (<option key={p.id} value={p.id}>{p.name} — {p.customerName}</option>))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Dari</label>
              <input type="date" value={dateFrom} onChange={(e) => handleFilterChange(() => setDateFrom(e.target.value))} className="w-full rounded-md border border-slate-200 px-3 py-2" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Sampai</label>
              <input type="date" value={dateTo} onChange={(e) => handleFilterChange(() => setDateTo(e.target.value))} className="w-full rounded-md border border-slate-200 px-3 py-2" />
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-700">
                <tr>
                  <th className="px-3 py-2">Pet</th>
                  <th className="px-3 py-2">Doctor</th>
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-sm text-slate-500">Belum ada medical record.</td>
                  </tr>
                ) : (
                  records.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-2">{r.appointment.pet.name}</td>
                      <td className="px-3 py-2">{r.appointment.doctor.name}</td>
                      <td className="px-3 py-2">{new Date(r.createdAt).toLocaleString()}</td>
                      <td className="px-3 py-2">
                        <Button size="sm" onClick={() => openDetail(r.id)}>Detail</Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">Menampilkan {Math.min(total, page * limit)} dari {total}</div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => handlePageChange(page - 1)} disabled={page <= 1}>Prev</Button>
              <div className="text-sm text-slate-700">{page} / {maxPage}</div>
              <Button size="sm" variant="outline" onClick={() => handlePageChange(page + 1)} disabled={page >= maxPage}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDetailOpen} onOpenChange={(v) => { setIsDetailOpen(v); if (!v) setSelectedRecordId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Medical Record</DialogTitle>
            <DialogDescription>Informasi lengkap medical record, treatment, medicine, vaccine, dan weight history.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {selectedRecordId ? (
              <RecordDetail id={selectedRecordId} onMessage={(m) => setMessage(m)} onError={(e) => setError(e)} initialServices={initialServices} initialMedicines={initialMedicines} />
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RecordDetail({ id, onMessage, onError, initialServices, initialMedicines }: { id: string; onMessage: (m: string) => void; onError: (e: string) => void; initialServices: { id: string; name: string; price: number }[]; initialMedicines: { id: string; name: string; stock: number; price: number }[] }) {
  type RecordDetailType = {
    id: string;
    createdAt: string;
    vitalSign?: string | null;
    diagnosis?: string | null;
    notes?: string | null;
    appointment: {
      id: string;
      pet: { id: string; name: string; customer: { user: { id: string; name: string } } };
      doctor: { id: string; name: string };
    };
    medicalRecordTreatments: { id: string; service: { id: string; name: string; price: number }; quantity: number; price: number; notes?: string | null; subtotal: number }[];
    recordMedicines: { id: string; medicine: { id: string; name: string; price: number }; quantity: number; dosage?: string | null; instruction?: string | null; price: number; subtotal: number }[];
    medicalRecordVaccines: { id: string; vaccine: string; batch?: string | null; expired?: Date | null; nextSchedule?: Date | null }[];
  };

  const [record, setRecord] = useState<RecordDetailType | null>(null);
  const [history, setHistory] = useState<{ id: string; weight: number; height: number | null; recordedAt: Date }[]>([]);
  const [weight, setWeight] = useState<string>("");
  const [editingWeightId, setEditingWeightId] = useState<string | null>(null);
  const [editingWeightValue, setEditingWeightValue] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [treatmentDraft, setTreatmentDraft] = useState({ serviceId: "", quantity: "1", price: "0", notes: "" });
  const [editingTreatmentId, setEditingTreatmentId] = useState<string | null>(null);
  const [treatmentEditDraft, setTreatmentEditDraft] = useState({ serviceId: "", quantity: "1", price: "0", notes: "" });
  const [medicineDraft, setMedicineDraft] = useState({ medicineId: "", quantity: "1", dosage: "", instruction: "", price: "0" });
  const [editingMedicineId, setEditingMedicineId] = useState<string | null>(null);
  const [medicineEditDraft, setMedicineEditDraft] = useState({ medicineId: "", quantity: "1", dosage: "", instruction: "", price: "0" });
  const [vaccineDraft, setVaccineDraft] = useState({ vaccine: "", batch: "", expired: "", nextSchedule: "", notes: "" });
  const [editingVaccineId, setEditingVaccineId] = useState<string | null>(null);
  const [vaccineEditDraft, setVaccineEditDraft] = useState({ vaccine: "", batch: "", expired: "", nextSchedule: "", notes: "" });
  const [invoicePayload, setInvoicePayload] = useState<{ items: { type: "SERVICE" | "MEDICINE"; refId: string; name: string; quantity: number; price: number; subtotal: number }[]; total: number } | null>(null);
  const [isEditRecordOpen, setIsEditRecordOpen] = useState(false);
  const [editDraft, setEditDraft] = useState({ anamnesis: "", physicalExam: "", diagnosis: "", temperature: "", weight: "", heartRate: "", respiration: "", notes: "" });

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await getMedicalRecord(id);
      if (!res.success) {
        if (mounted) onError(res.error.message);
        return;
      }

      if (!mounted) return;
      const rec = res.data.record as RecordDetailType;
      setRecord(rec);

      const petId = rec?.appointment?.pet?.id as string | undefined;
      if (petId) {
        const h = await getWeightHistory(petId);
        if (mounted && h.success) setHistory(h.data.history);
      }
    })();
    return () => { mounted = false; };
  }, [id, onError]);

  const submitAddWeight = () => {
    if (!record || !record.appointment?.pet?.id) return;
    startTransition(async () => {
      const res = await addWeightHistory({ petId: record.appointment.pet.id, weight: parseFloat(weight) });
      if (!res.success) {
        onError(res.error.message);
        return;
      }
      onMessage("Berat berhasil ditambahkan.");
      const h = await getWeightHistory(record.appointment.pet.id);
      if (h.success) setHistory(h.data.history);
      setWeight("");
    });
  };

  const submitUpdateWeight = (entryId: string) => {
    if (!record || !record.appointment?.pet?.id) return;
    startTransition(async () => {
      try {
        const res = await updateWeightHistory({ id: entryId, petId: record.appointment.pet.id, weight: parseFloat(editingWeightValue) });
        if (!res.success) return onError(res.error.message);
        onMessage("Berat berhasil diperbarui.");
        const h = await getWeightHistory(record.appointment.pet.id);
        if (h.success) setHistory(h.data.history);
        setEditingWeightId(null);
        setEditingWeightValue("");
      } catch (err: unknown) {
        if (err instanceof Error) onError(err.message);
      }
    });
  };

  const submitAddTreatment = () => {
    if (!record) return;
    startTransition(async () => {
      try {
        const parsed = treatmentSchema.parse({ medicalRecordId: record.id, serviceId: treatmentDraft.serviceId, quantity: Number(treatmentDraft.quantity), price: Number(treatmentDraft.price), notes: treatmentDraft.notes || undefined });
        const res = await addTreatment(parsed);
        if (!res.success) return onError(res.error.message);
        onMessage("Treatment ditambahkan.");
        const r = await getMedicalRecord(record!.id);
        if (r.success) setRecord(r.data.record as RecordDetailType);
      } catch (err: unknown) {
        if (err instanceof Error) onError(err.message);
      }
    });
  };

  const startEditTreatment = (t: { id: string; service: { id: string; name: string; price: number }; quantity: number; price: number; notes?: string | null }) => {
    setEditingTreatmentId(t.id);
    setTreatmentEditDraft({ serviceId: t.service.id, quantity: String(t.quantity), price: String(t.price), notes: t.notes ?? "" });
  };

  const submitUpdateTreatment = (id: string) => {
    startTransition(async () => {
      try {
        const parsed = { id, medicalRecordId: record!.id, serviceId: treatmentEditDraft.serviceId, quantity: Number(treatmentEditDraft.quantity), price: Number(treatmentEditDraft.price), notes: treatmentEditDraft.notes || undefined };
        const res = await updateTreatment(parsed);
        if (!res.success) return onError(res.error.message);
        onMessage("Treatment diperbarui.");
        const r = await getMedicalRecord(record!.id);
        if (r.success) setRecord(r.data.record as RecordDetailType);
        setEditingTreatmentId(null);
      } catch (err: unknown) {
        if (err instanceof Error) onError(err.message);
      }
    });
  };

  const submitRemoveTreatment = (id: string) => {
    if (!confirm("Hapus treatment ini?")) return;
    startTransition(async () => {
      const res = await removeTreatment(id);
      if (!res.success) return onError(res.error.message);
      onMessage("Treatment dihapus.");
      const r = await getMedicalRecord(record!.id);
      if (r.success) setRecord(r.data.record as RecordDetailType);
    });
  };

  const submitAddMedicine = () => {
    if (!record) return;
    startTransition(async () => {
      try {
        const selected = initialMedicines.find((m) => m.id === medicineDraft.medicineId);
        const qty = Number(medicineDraft.quantity);
        if (!selected) return onError("Medicine tidak ditemukan");
        if (qty > selected.stock) return onError("Stok tidak cukup");

        const parsed = medicineSchema.parse({ medicalRecordId: record.id, medicineId: medicineDraft.medicineId, quantity: qty, dosage: medicineDraft.dosage || undefined, instruction: medicineDraft.instruction || undefined, price: Number(medicineDraft.price) });
        const res = await addMedicine(parsed);
        if (!res.success) return onError(res.error.message);
        onMessage("Medicine ditambahkan.");
        const r = await getMedicalRecord(record!.id);
        if (r.success) setRecord(r.data.record as RecordDetailType);
      } catch (err: unknown) {
        if (err instanceof Error) onError(err.message);
      }
    });
  };

  const startEditMedicine = (m: { id: string; medicine: { id: string; name: string; price: number }; quantity: number; dosage?: string | null; instruction?: string | null; price: number }) => {
    setEditingMedicineId(m.id);
    setMedicineEditDraft({ medicineId: m.medicine.id, quantity: String(m.quantity), dosage: m.dosage ?? "", instruction: m.instruction ?? "", price: String(m.price) });
  };

  const submitUpdateMedicine = (id: string) => {
    startTransition(async () => {
      try {
        const parsed = { id, medicalRecordId: record!.id, medicineId: medicineEditDraft.medicineId, quantity: Number(medicineEditDraft.quantity), dosage: medicineEditDraft.dosage || undefined, instruction: medicineEditDraft.instruction || undefined, price: Number(medicineEditDraft.price) };
        const res = await updateMedicine(parsed);
        if (!res.success) return onError(res.error.message);
        onMessage("Medicine diperbarui.");
        const r = await getMedicalRecord(record!.id);
        if (r.success) setRecord(r.data.record as RecordDetailType);
        setEditingMedicineId(null);
      } catch (err: unknown) {
        if (err instanceof Error) onError(err.message);
      }
    });
  };

  const submitRemoveMedicine = (id: string) => {
    if (!confirm("Hapus medicine ini?")) return;
    startTransition(async () => {
      const res = await removeMedicine(id);
      if (!res.success) return onError(res.error.message);
      onMessage("Medicine dihapus.");
      const r = await getMedicalRecord(record!.id);
      if (r.success) setRecord(r.data.record as RecordDetailType);
    });
  };

  const submitAddVaccine = () => {
    if (!record) return;
    startTransition(async () => {
      try {
        const parsed = vaccineSchema.parse({ medicalRecordId: record.id, vaccine: vaccineDraft.vaccine, batch: vaccineDraft.batch || undefined, expired: vaccineDraft.expired || undefined, nextSchedule: vaccineDraft.nextSchedule || undefined });
        const res = await addVaccine(parsed);
        if (!res.success) return onError(res.error.message);
        onMessage("Vaccine ditambahkan.");
        const r = await getMedicalRecord(record!.id);
        if (r.success) setRecord(r.data.record as RecordDetailType);
      } catch (err: unknown) {
        if (err instanceof Error) onError(err.message);
      }
    });
  };

  const startEditVaccine = (v: { id: string; vaccine: string; batch?: string | null; expired?: Date | null; nextSchedule?: Date | null }) => {
    setEditingVaccineId(v.id);
    setVaccineEditDraft({ vaccine: v.vaccine, batch: v.batch ?? "", expired: v.expired ? new Date(v.expired).toISOString().slice(0, 10) : "", nextSchedule: v.nextSchedule ? new Date(v.nextSchedule).toISOString().slice(0, 10) : "", notes: "" });
  };

  const submitUpdateVaccine = (id: string) => {
    startTransition(async () => {
      try {
        const parsed = { id, medicalRecordId: record!.id, vaccine: vaccineEditDraft.vaccine, batch: vaccineEditDraft.batch || undefined, expired: vaccineEditDraft.expired || undefined, nextSchedule: vaccineEditDraft.nextSchedule || undefined };
        const res = await updateVaccine(parsed);
        if (!res.success) return onError(res.error.message);
        onMessage("Vaccine diperbarui.");
        const r = await getMedicalRecord(record!.id);
        if (r.success) setRecord(r.data.record as RecordDetailType);
        setEditingVaccineId(null);
      } catch (err: unknown) {
        if (err instanceof Error) onError(err.message);
      }
    });
  };

  const submitRemoveVaccine = (id: string) => {
    if (!confirm("Hapus vaccine ini?")) return;
    startTransition(async () => {
      const res = await removeVaccine(id);
      if (!res.success) return onError(res.error.message);
      onMessage("Vaccine dihapus.");
      const r = await getMedicalRecord(record!.id);
      if (r.success) setRecord(r.data.record as RecordDetailType);
    });
  };

  const handlePrepareInvoice = () => {
    startTransition(async () => {
      const res = await prepareInvoiceForMedicalRecord(record!.id);
      if (!res.success) return onError(res.error.message);
      setInvoicePayload(res.data.payload);
    });
  };

  if (!record) return <div>Memuat detail...</div>;

  return (
    <div>
      <div className="space-y-2">
        <div><strong>Pet:</strong> {record.appointment.pet.name} — {record.appointment.pet.customer.user.name}</div>
        <div><strong>Doctor:</strong> {record.appointment.doctor.name}</div>
        <div><strong>Created:</strong> {new Date(record.createdAt).toLocaleString()}</div>
        <div><strong>Vital Sign:</strong> {record.vitalSign ?? '-'}</div>
        <div><strong>Diagnosis:</strong> {record.diagnosis ?? '-'}</div>
        <div><strong>Notes:</strong> {record.notes ?? '-'}</div>
        <div className="flex gap-2 mt-2">
          <Dialog open={isEditRecordOpen} onOpenChange={(v) => setIsEditRecordOpen(v)}>
            <DialogTrigger asChild>
              <Button size="sm">Edit Medical Record</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Medical Record</DialogTitle>
                <DialogDescription>Perbarui data medical record.</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-2">
                <div>
                  <label className="block text-sm">Complaint / Anamnesis</label>
                  <textarea value={editDraft.anamnesis} onChange={(e) => setEditDraft((p) => ({ ...p, anamnesis: e.target.value }))} className="w-full rounded-md border px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm">Diagnosis</label>
                  <input value={editDraft.diagnosis} onChange={(e) => setEditDraft((p) => ({ ...p, diagnosis: e.target.value }))} className="w-full rounded-md border px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm">Physical Exam</label>
                  <input value={editDraft.physicalExam} onChange={(e) => setEditDraft((p) => ({ ...p, physicalExam: e.target.value }))} className="w-full rounded-md border px-3 py-2" />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <input placeholder="Temperature" value={editDraft.temperature} onChange={(e) => setEditDraft((p) => ({ ...p, temperature: e.target.value }))} className="rounded-md border px-3 py-2" />
                  <input placeholder="Weight (kg)" value={editDraft.weight} onChange={(e) => setEditDraft((p) => ({ ...p, weight: e.target.value }))} className="rounded-md border px-3 py-2" />
                  <input placeholder="Heart Rate" value={editDraft.heartRate} onChange={(e) => setEditDraft((p) => ({ ...p, heartRate: e.target.value }))} className="rounded-md border px-3 py-2" />
                  <input placeholder="Respiration" value={editDraft.respiration} onChange={(e) => setEditDraft((p) => ({ ...p, respiration: e.target.value }))} className="rounded-md border px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm">Notes</label>
                  <textarea value={editDraft.notes} onChange={(e) => setEditDraft((p) => ({ ...p, notes: e.target.value }))} className="w-full rounded-md border px-3 py-2" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditRecordOpen(false)}>Batal</Button>
                <Button onClick={async () => {
                  try {
                    const parsed: UpdateMedicalRecordInput = { id: record.id, anamnesis: editDraft.anamnesis || undefined, physicalExam: editDraft.physicalExam || undefined, diagnosis: editDraft.diagnosis || undefined, temperature: editDraft.temperature ? Number(editDraft.temperature) : undefined, weight: editDraft.weight ? Number(editDraft.weight) : undefined, heartRate: editDraft.heartRate ? Number(editDraft.heartRate) : undefined, respiration: editDraft.respiration ? Number(editDraft.respiration) : undefined, notes: editDraft.notes || undefined };
                    const res = await updateMedicalRecord(parsed);
                    if (!res.success) return onError(res.error.message);
                    onMessage('Medical record diperbarui.');
                    const r = await getMedicalRecord(record.id);
                    if (r.success) setRecord(r.data.record as RecordDetailType);
                    setIsEditRecordOpen(false);
                  } catch (err: unknown) {
                    if (err instanceof Error) onError(err.message);
                  }
                }}>Simpan</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="mt-2">
          <Button size="sm" onClick={handlePrepareInvoice}>Preview Invoice</Button>
        </div>
        {invoicePayload ? (
          <div className="mt-2 rounded-md border p-2 text-sm">
            <div className="font-semibold">Invoice Preview</div>
            <ul className="list-disc pl-5">
              {invoicePayload.items.map((it, idx) => (<li key={idx}>{it.name} — {it.quantity} x {it.price} = {it.subtotal}</li>))}
            </ul>
            <div className="mt-1 font-semibold">Total: {invoicePayload.total}</div>
          </div>
        ) : null}
      </div>

      <div className="mt-6">
        <h4 className="text-sm font-semibold">Weight History</h4>
        <div className="space-y-2 mt-2">
          {history.length === 0 ? <div className="text-sm text-slate-500">Belum ada riwayat berat.</div> : (
            <div>
              <svg viewBox="0 0 300 100" className="w-full h-24 bg-white border rounded-md">
                {(() => {
                  const pts = [...history].reverse();
                  const max = Math.max(...pts.map((p) => p.weight), 1);
                  const min = Math.min(...pts.map((p) => p.weight), 0);
                  const range = Math.max(1, max - min);
                  return pts.map((p, i) => {
                    const x = (i / Math.max(1, pts.length - 1)) * 300;
                    const y = 100 - ((p.weight - min) / range) * 100;
                    return <circle key={p.id} cx={x} cy={y} r={3} fill="#0ea5" />;
                  });
                })()}
              </svg>

              <ul className="list-disc pl-5 text-sm mt-2">
                {history.map((h) => (
                  <li key={h.id} className="flex items-center justify-between">
                    <div>{h.weight} kg — {new Date(h.recordedAt).toLocaleDateString()}</div>
                    <div className="flex gap-2">
                      {editingWeightId === h.id ? (
                        <>
                          <input value={editingWeightValue} onChange={(e) => setEditingWeightValue(e.target.value)} className="rounded-md border px-2 py-1" />
                          <Button size="sm" onClick={() => submitUpdateWeight(h.id)}>Simpan</Button>
                          <Button size="sm" variant="outline" onClick={() => { setEditingWeightId(null); setEditingWeightValue(""); }}>Batal</Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" onClick={() => { setEditingWeightId(h.id); setEditingWeightValue(String(h.weight)); }}>Edit</Button>
                          <Button size="sm" variant="outline" className="text-rose-600" onClick={() => { if (confirm('Hapus entry berat?')) { startTransition(async () => { const res = await removeWeightHistory(h.id); if (!res.success) return onError(res.error.message); onMessage('Entry berat dihapus.'); const hh = await getWeightHistory(record.appointment.pet.id); if (hh.success) setHistory(hh.data.history); }); } }}>Hapus</Button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-2">
            <input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Berat (kg)" className="rounded-md border border-slate-200 px-3 py-2" />
            <Button onClick={submitAddWeight} disabled={isPending || !weight}>Tambah</Button>
          </div>
        </div>
      </div>
      <div className="mt-6">
        <h4 className="text-sm font-semibold">Treatments</h4>
        <div className="mt-2 space-y-2">
          {record.medicalRecordTreatments.length === 0 ? <div className="text-sm text-slate-500">Belum ada treatment.</div> : (
            <ul className="list-disc pl-5 text-sm">
              {record.medicalRecordTreatments.map((t) => (
                <li key={t.id} className="flex items-center justify-between">
                  <div>{t.service.name} — {t.quantity} x {t.price} = {t.subtotal}</div>
                  <div className="flex gap-2">
                    {editingTreatmentId === t.id ? (
                      <>
                        <select value={treatmentEditDraft.serviceId} onChange={(e) => setTreatmentEditDraft((p) => ({ ...p, serviceId: e.target.value }))} className="rounded-md border px-2 py-1">
                          {initialServices.map((s) => (<option key={s.id} value={s.id}>{s.name} — {s.price}</option>))}
                        </select>
                        <input value={treatmentEditDraft.quantity} onChange={(e) => setTreatmentEditDraft((p) => ({ ...p, quantity: e.target.value }))} className="rounded-md border px-2 py-1 w-20" />
                        <input value={treatmentEditDraft.price} onChange={(e) => setTreatmentEditDraft((p) => ({ ...p, price: e.target.value }))} className="rounded-md border px-2 py-1 w-24" />
                        <Button size="sm" onClick={() => submitUpdateTreatment(t.id)}>Simpan</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingTreatmentId(null)}>Batal</Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" onClick={() => startEditTreatment(t)}>Edit</Button>
                        <Button size="sm" variant="outline" className="text-rose-600" onClick={() => submitRemoveTreatment(t.id)}>Hapus</Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="grid grid-cols-4 gap-2">
            <select value={treatmentDraft.serviceId} onChange={(e) => setTreatmentDraft((p) => ({ ...p, serviceId: e.target.value }))} className="rounded-md border px-3 py-2">
              <option value="">Pilih service</option>
              {initialServices.map((s) => (<option key={s.id} value={s.id}>{s.name} — {s.price}</option>))}
            </select>
            <input value={treatmentDraft.quantity} onChange={(e) => setTreatmentDraft((p) => ({ ...p, quantity: e.target.value }))} className="rounded-md border px-3 py-2" />
            <input value={treatmentDraft.price} onChange={(e) => setTreatmentDraft((p) => ({ ...p, price: e.target.value }))} className="rounded-md border px-3 py-2" />
            <Button size="sm" onClick={submitAddTreatment} disabled={isPending}>Tambah</Button>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h4 className="text-sm font-semibold">Medicines</h4>
        <div className="mt-2 space-y-2">
          {record.recordMedicines.length === 0 ? <div className="text-sm text-slate-500">Belum ada medicine.</div> : (
            <ul className="list-disc pl-5 text-sm">
              {record.recordMedicines.map((m) => (
                <li key={m.id} className="flex items-center justify-between">
                  <div>{m.medicine.name} — {m.quantity} x {m.price} = {m.subtotal}</div>
                  <div className="flex gap-2">
                    {editingMedicineId === m.id ? (
                      <>
                        <select value={medicineEditDraft.medicineId} onChange={(e) => setMedicineEditDraft((p) => ({ ...p, medicineId: e.target.value }))} className="rounded-md border px-2 py-1">
                          {initialMedicines.map((im) => (<option key={im.id} value={im.id}>{im.name} — stok: {im.stock}</option>))}
                        </select>
                        <input value={medicineEditDraft.quantity} onChange={(e) => setMedicineEditDraft((p) => ({ ...p, quantity: e.target.value }))} className="rounded-md border px-2 py-1 w-20" />
                        <input value={medicineEditDraft.dosage} onChange={(e) => setMedicineEditDraft((p) => ({ ...p, dosage: e.target.value }))} className="rounded-md border px-2 py-1 w-28" />
                        <Button size="sm" onClick={() => submitUpdateMedicine(m.id)}>Simpan</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingMedicineId(null)}>Batal</Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" onClick={() => startEditMedicine(m)}>Edit</Button>
                        <Button size="sm" variant="outline" className="text-rose-600" onClick={() => submitRemoveMedicine(m.id)}>Hapus</Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="grid grid-cols-5 gap-2">
            <select value={medicineDraft.medicineId} onChange={(e) => { setMedicineDraft((p) => ({ ...p, medicineId: e.target.value })); }} className="rounded-md border px-3 py-2">
              <option value="">Pilih medicine</option>
              {initialMedicines.map((m) => (<option key={m.id} value={m.id}>{m.name} — stok: {m.stock}</option>))}
            </select>
            <input value={medicineDraft.quantity} onChange={(e) => setMedicineDraft((p) => ({ ...p, quantity: e.target.value }))} className="rounded-md border px-3 py-2" />
            <input value={medicineDraft.dosage} onChange={(e) => setMedicineDraft((p) => ({ ...p, dosage: e.target.value }))} className="rounded-md border px-3 py-2" placeholder="Dosage" />
            <input value={medicineDraft.instruction} onChange={(e) => setMedicineDraft((p) => ({ ...p, instruction: e.target.value }))} className="rounded-md border px-3 py-2" placeholder="Instruksi" />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={submitAddMedicine} disabled={isPending}>Tambah</Button>
            </div>
          </div>
          <div className="text-xs text-slate-500">Stok preview: pilih medicine untuk melihat stok saat ini sebelum menambahkan.</div>
        </div>
      </div>

      <div className="mt-6">
        <h4 className="text-sm font-semibold">Vaccines</h4>
        <div className="mt-2 space-y-2">
          {record.medicalRecordVaccines.length === 0 ? <div className="text-sm text-slate-500">Belum ada vaccine.</div> : (
            <ul className="list-disc pl-5 text-sm">
              {record.medicalRecordVaccines.map((v) => (
                <li key={v.id} className="flex items-center justify-between">
                  <div>{v.vaccine} — batch: {v.batch ?? '-'} — expired: {v.expired ? new Date(v.expired).toLocaleDateString() : '-'}</div>
                  <div className="flex gap-2">
                    {editingVaccineId === v.id ? (
                      <>
                        <input value={vaccineEditDraft.vaccine} onChange={(e) => setVaccineEditDraft((p) => ({ ...p, vaccine: e.target.value }))} className="rounded-md border px-2 py-1" />
                        <input value={vaccineEditDraft.batch} onChange={(e) => setVaccineEditDraft((p) => ({ ...p, batch: e.target.value }))} className="rounded-md border px-2 py-1" />
                        <input type="date" value={vaccineEditDraft.expired} onChange={(e) => setVaccineEditDraft((p) => ({ ...p, expired: e.target.value }))} className="rounded-md border px-2 py-1" />
                        <Button size="sm" onClick={() => submitUpdateVaccine(v.id)}>Simpan</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingVaccineId(null)}>Batal</Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" onClick={() => startEditVaccine(v)}>Edit</Button>
                        <Button size="sm" variant="outline" className="text-rose-600" onClick={() => submitRemoveVaccine(v.id)}>Hapus</Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="grid grid-cols-4 gap-2">
            <input value={vaccineDraft.vaccine} onChange={(e) => setVaccineDraft((p) => ({ ...p, vaccine: e.target.value }))} className="rounded-md border px-3 py-2" placeholder="Nama vaccine" />
            <input value={vaccineDraft.batch} onChange={(e) => setVaccineDraft((p) => ({ ...p, batch: e.target.value }))} className="rounded-md border px-3 py-2" placeholder="Batch" />
            <input type="date" value={vaccineDraft.expired} onChange={(e) => setVaccineDraft((p) => ({ ...p, expired: e.target.value }))} className="rounded-md border px-3 py-2" />
            <Button size="sm" onClick={submitAddVaccine} disabled={isPending}>Tambah</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
