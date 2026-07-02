"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createPet, disablePet, enablePet, getPet, getPets, updatePet } from "@/lib/actions/pet.actions";

export type PetManagementPet = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  color: string | null;
  birthDate: Date | null;
  weight: number | null;
  microchip: string | null;
  gender: "MALE" | "FEMALE";
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  customer: {
    id: string;
    user: {
      id: string;
      username: string;
      name: string;
      phone: string | null;
    };
  };
};

export type PetDetail = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  color: string | null;
  birthDate: Date | null;
  weight: number | null;
  microchip: string | null;
  gender: "MALE" | "FEMALE";
  notes: string | null;
  isActive: boolean;
  customer: {
    id: string;
    address: string | null;
    user: {
      id: string;
      username: string;
      name: string;
      phone: string | null;
    };
  };
  appointments: Array<{
    id: string;
    status: string;
    scheduledAt: Date;
    doctor: { id: string; name: string };
    medicalRecord: {
      id: string;
      vitalSign: string | null;
      diagnosis: string | null;
      treatment: string | null;
      prescription: string | null;
      notes: string | null;
      createdAt: Date;
    } | null;
  }>;
};

type CustomerOption = {
  id: string;
  user: { id: string; username: string; name: string };
};

type Props = {
  initialPets: PetManagementPet[];
  initialTotal: number;
  initialPage: number;
  initialLimit: number;
  initialCustomers: CustomerOption[];
  currentUserRole: "OWNER" | "ADMIN" | "DOKTER";
};

const emptyDraft = {
  id: "",
  customerId: "",
  name: "",
  species: "",
  breed: "",
  color: "",
  birthDate: "",
  weight: "",
  microchip: "",
  gender: "MALE" as "MALE" | "FEMALE",
  notes: "",
};

export function PetManagementClient({ initialPets, initialTotal, initialPage, initialLimit, initialCustomers, currentUserRole }: Props) {
  const [pets, setPets] = useState(initialPets);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [limit] = useState(initialLimit);
  const [search, setSearch] = useState("");
  const [speciesFilter, setSpeciesFilter] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [detailPet, setDetailPet] = useState<PetDetail | null>(null);
  const [detailAge, setDetailAge] = useState<string>("-");
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const maxPage = Math.max(1, Math.ceil(total / limit));
  const speciesOptions = Array.from(new Set(pets.map((pet) => pet.species))).sort();
  const canManage = currentUserRole === "OWNER" || currentUserRole === "ADMIN";

  const loadPets = async (pageToLoad: number, searchQuery: string, species: string, inactive: boolean) => {
    setError(null);
    setMessage(null);

    const result = await getPets({ page: pageToLoad, limit, search: searchQuery, species, showInactive: inactive });
    if (!result.success) {
      setError(result.error.message);
      return;
    }

    setPets(result.data.pets);
    setTotal(result.data.total);
    setPage(pageToLoad);
  };

  const resetForm = () => {
    setDraft(emptyDraft);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsEditMode(false);
    setIsDialogOpen(true);
  };

  const openEditDialog = (pet: PetManagementPet) => {
    setDraft({
      id: pet.id,
      customerId: pet.customer.id,
      name: pet.name,
      species: pet.species,
      breed: pet.breed ?? "",
      color: pet.color ?? "",
      birthDate: pet.birthDate ? pet.birthDate.toISOString().slice(0, 10) : "",
      weight: pet.weight?.toString() ?? "",
      microchip: pet.microchip ?? "",
      gender: pet.gender,
      notes: pet.notes ?? "",
    });
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const openDetailDialog = async (pet: PetManagementPet) => {
    setError(null);
    setMessage(null);
    setIsDetailOpen(true);

    const result = await getPet(pet.id);
    if (!result.success) {
      setError(result.error.message);
      return;
    }

    const loadedPet = result.data.pet;
    setDetailPet(loadedPet);
    if (loadedPet.birthDate) {
      const now = new Date();
      const birth = new Date(loadedPet.birthDate);
      const age = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365));
      setDetailAge(`${age} tahun`);
    } else {
      setDetailAge("-");
    }
  };

  const submitCreateOrEdit = () => {
    if (!canManage) {
      setError("Akses tidak cukup untuk membuat atau mengubah pet.");
      return;
    }

    startTransition(async () => {
      setError(null);
      setMessage(null);

      const payload = {
        customerId: draft.customerId,
        name: draft.name,
        species: draft.species,
        breed: draft.breed || undefined,
        color: draft.color || undefined,
        birthDate: draft.birthDate || undefined,
        weight: draft.weight ? Number(draft.weight) : undefined,
        microchip: draft.microchip || undefined,
        gender: draft.gender,
        notes: draft.notes || undefined,
      } as const;

      if (isEditMode) {
        const result = await updatePet({
          id: draft.id,
          ...payload,
        });

        if (!result.success) {
          setError(result.error.message);
          return;
        }

        await loadPets(page, search, speciesFilter, showInactive);
        setMessage("Pet berhasil diperbarui.");
        setIsDialogOpen(false);
        return;
      }

      const result = await createPet(payload);
      if (!result.success) {
        setError(result.error.message);
        return;
      }

      await loadPets(1, search, speciesFilter, showInactive);
      setMessage("Pet berhasil dibuat.");
      setIsDialogOpen(false);
    });
  };

  const submitDisablePet = (petId: string) => {
    if (!canManage) {
      setError("Akses tidak cukup untuk menonaktifkan pet.");
      return;
    }

    startTransition(async () => {
      setError(null);
      setMessage(null);

      const result = await disablePet(petId);
      if (!result.success) {
        setError(result.error.message);
        return;
      }

      await loadPets(page, search, speciesFilter, showInactive);
      setMessage("Pet berhasil dinonaktifkan.");
    });
  };

  const submitEnablePet = (petId: string) => {
    if (!canManage) {
      setError("Akses tidak cukup untuk mengaktifkan pet.");
      return;
    }

    startTransition(async () => {
      setError(null);
      setMessage(null);

      const result = await enablePet(petId);
      if (!result.success) {
        setError(result.error.message);
        return;
      }

      await loadPets(page, search, speciesFilter, showInactive);
      setMessage("Pet berhasil diaktifkan.");
    });
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    startTransition(() => {
      loadPets(1, value, speciesFilter, showInactive);
    });
  };

  const handleSpeciesChange = (value: string) => {
    setSpeciesFilter(value);
    startTransition(() => {
      loadPets(1, search, value, showInactive);
    });
  };

  const handleShowInactiveChange = () => {
    setShowInactive((prev) => {
      const next = !prev;
      startTransition(() => {
        loadPets(1, search, speciesFilter, next);
      });
      return next;
    });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > maxPage) {
      return;
    }
    startTransition(() => {
      loadPets(newPage, search, speciesFilter, showInactive);
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Pet Management</CardTitle>
            <CardDescription>Kelola pet milik customer dengan pencarian dan filter.</CardDescription>
          </div>
          {canManage ? (
            <Dialog open={isDialogOpen} onOpenChange={(value) => { setIsDialogOpen(value); if (!value) resetForm(); }}>
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog}>Tambah Pet</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{isEditMode ? "Edit Pet" : "Tambah Pet"}</DialogTitle>
                  <DialogDescription>Isi data pet dengan lengkap untuk catatan klinik.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Customer</label>
                    <select value={draft.customerId} onChange={(e) => setDraft((prev) => ({ ...prev, customerId: e.target.value }))} className="w-full rounded-md border border-slate-200 px-3 py-2">
                      <option value="">Pilih customer</option>
                      {initialCustomers.map((customer) => (
                        <option key={customer.id} value={customer.id}>{customer.user.name} ({customer.user.username})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Nama</label>
                    <input value={draft.name} onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))} className="w-full rounded-md border border-slate-200 px-3 py-2" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Spesies</label>
                    <input value={draft.species} onChange={(e) => setDraft((prev) => ({ ...prev, species: e.target.value }))} className="w-full rounded-md border border-slate-200 px-3 py-2" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Ras</label>
                    <input value={draft.breed} onChange={(e) => setDraft((prev) => ({ ...prev, breed: e.target.value }))} className="w-full rounded-md border border-slate-200 px-3 py-2" />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Jenis Kelamin</label>
                      <select value={draft.gender} onChange={(e) => setDraft((prev) => ({ ...prev, gender: e.target.value as "MALE" | "FEMALE" }))} className="w-full rounded-md border border-slate-200 px-3 py-2">
                        <option value="MALE">MALE</option>
                        <option value="FEMALE">FEMALE</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Warna</label>
                      <input value={draft.color} onChange={(e) => setDraft((prev) => ({ ...prev, color: e.target.value }))} className="w-full rounded-md border border-slate-200 px-3 py-2" />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Tanggal Lahir</label>
                      <input type="date" value={draft.birthDate} onChange={(e) => setDraft((prev) => ({ ...prev, birthDate: e.target.value }))} className="w-full rounded-md border border-slate-200 px-3 py-2" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Berat (kg)</label>
                      <input type="number" value={draft.weight} onChange={(e) => setDraft((prev) => ({ ...prev, weight: e.target.value }))} className="w-full rounded-md border border-slate-200 px-3 py-2" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Microchip</label>
                      <input value={draft.microchip} onChange={(e) => setDraft((prev) => ({ ...prev, microchip: e.target.value }))} className="w-full rounded-md border border-slate-200 px-3 py-2" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Catatan</label>
                    <textarea value={draft.notes} onChange={(e) => setDraft((prev) => ({ ...prev, notes: e.target.value }))} className="w-full rounded-md border border-slate-200 px-3 py-2" rows={4} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { resetForm(); setIsDialogOpen(false); }}>Batal</Button>
                  <Button onClick={submitCreateOrEdit} disabled={isPending}>{isEditMode ? "Simpan" : "Simpan"}</Button>
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
            <input value={search} onChange={(e) => handleSearchChange(e.target.value)} placeholder="Cari pet, customer, atau rekam medis..." className="w-full rounded-md border border-slate-200 px-3 py-2 sm:col-span-2" />
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-2 text-sm text-slate-500">
                <input type="checkbox" checked={showInactive} onChange={handleShowInactiveChange} className="h-4 w-4 rounded border-slate-300 text-slate-900" />
                Nonaktif
              </label>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Filter Spesies</label>
              <select value={speciesFilter} onChange={(e) => handleSpeciesChange(e.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-2">
                <option value="">Semua spesies</option>
                {speciesOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <p className="text-sm text-slate-500">Menampilkan {pets.length} dari {total} pet.</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-700">
                <tr>
                  <th className="px-3 py-2">Nama</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Spesies</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-slate-500">Tidak ada pet yang cocok.</td>
                  </tr>
                ) : (
                  pets.map((pet) => (
                    <tr key={pet.id} className="border-t border-slate-200">
                      <td className="px-3 py-2">{pet.name}</td>
                      <td className="px-3 py-2">{pet.customer.user.name}</td>
                      <td className="px-3 py-2">{pet.species}</td>
                      <td className="px-3 py-2">{pet.isActive ? "Aktif" : "Nonaktif"}</td>
                      <td className="flex flex-wrap gap-2 px-3 py-2">
                        <Button size="sm" variant="outline" onClick={() => openDetailDialog(pet)}>Detail</Button>
                        {canManage ? (
                          <>
                            <Button size="sm" variant="outline" onClick={() => openEditDialog(pet)}>Edit</Button>
                            {pet.isActive ? (
                              <Button size="sm" variant="outline" onClick={() => submitDisablePet(pet.id)}>Nonaktif</Button>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => submitEnablePet(pet.id)}>Aktifkan</Button>
                            )}
                          </>
                        ) : null}
                      </td>
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

      <Dialog open={isDetailOpen} onOpenChange={(value) => { setIsDetailOpen(value); if (!value) { setDetailPet(null); setDetailAge("-"); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Pet</DialogTitle>
            <DialogDescription>Informasi lengkap pet serta riwayat kunjungan.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {detailPet ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-slate-500">Nama</p>
                    <p className="font-medium">{detailPet.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Customer</p>
                    <p className="font-medium">{detailPet.customer.user.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Spesies</p>
                    <p className="font-medium">{detailPet.species}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Jenis Kelamin</p>
                    <p className="font-medium">{detailPet.gender}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Umur</p>
                    <p className="font-medium">{detailAge}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Berat</p>
                    <p className="font-medium">{detailPet.weight ? `${detailPet.weight} kg` : "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Microchip</p>
                    <p className="font-medium">{detailPet.microchip ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Alamat Customer</p>
                    <p className="font-medium">{detailPet.customer.address ?? "-"}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-2 text-sm font-semibold">Riwayat Kunjungan</p>
                  {detailPet.appointments.length === 0 ? (
                    <p className="text-sm text-slate-500">Belum ada kunjungan.</p>
                  ) : (
                    <div className="space-y-3">
                      {detailPet.appointments.map((appointment) => (
                        <div key={appointment.id} className="rounded-lg bg-white p-3 shadow-sm">
                          <div className="flex flex-col gap-1 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between">
                            <span className="font-medium">{new Date(appointment.scheduledAt).toLocaleDateString()}</span>
                            <span>{appointment.status}</span>
                          </div>
                          <p className="text-sm text-slate-500">Dokter: {appointment.doctor.name}</p>
                          <p className="text-sm text-slate-500">Rekam medis: {appointment.medicalRecord?.id ?? "-"}</p>
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            <div>
                              <p className="text-xs uppercase text-slate-400">Diagnosis</p>
                              <p className="text-sm text-slate-700">{appointment.medicalRecord?.diagnosis ?? "-"}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase text-slate-400">Tindakan</p>
                              <p className="text-sm text-slate-700">{appointment.medicalRecord?.treatment ?? "-"}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">Memuat detail pet...</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
