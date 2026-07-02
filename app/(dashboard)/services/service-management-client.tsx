"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getServices, createService, updateService, disableService, enableService } from "@/lib/actions/service.actions";

export type ServiceManagementItem = {
  id: string;
  name: string;
  price: number;
  category: string;
  isActive: boolean;
};

type Props = {
  initialServices: ServiceManagementItem[];
  initialTotal: number;
  initialPage: number;
  initialLimit: number;
};

const defaultDraft = {
  id: "",
  name: "",
  price: "",
  category: "",
};

export function ServiceManagementClient({ initialServices, initialTotal, initialPage, initialLimit }: Props) {
  const [services, setServices] = useState(initialServices);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [limit] = useState(initialLimit);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [draft, setDraft] = useState(defaultDraft);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const maxPage = Math.max(1, Math.ceil(total / limit));

  const loadServices = async (pageToLoad: number, searchQuery: string, showInactiveValue: boolean) => {
    setError(null);
    setMessage(null);

    const result = await getServices({ page: pageToLoad, limit, search: searchQuery, showInactive: showInactiveValue });
    if (!result.success) {
      setError(result.error.message);
      return;
    }

    setServices(result.data.services);
    setTotal(result.data.total);
    setPage(pageToLoad);
  };

  const resetDraft = () => {
    setDraft(defaultDraft);
    setIsEditMode(false);
  };

  const handleCreateOpen = () => {
    resetDraft();
    setIsDialogOpen(true);
  };

  const handleEditOpen = (service: ServiceManagementItem) => {
    setDraft({ id: service.id, name: service.name, price: String(service.price), category: service.category });
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const submitCreateOrUpdate = () => {
    startTransition(async () => {
      setError(null);
      setMessage(null);

      const payload = {
        name: draft.name,
        category: draft.category,
        price: Number(draft.price),
      } as const;

      if (isEditMode) {
        const result = await updateService({ id: draft.id, ...payload });
        if (!result.success) {
          setError(result.error.message);
          return;
        }

        await loadServices(page, search, showInactive);
        setMessage("Service berhasil diperbarui.");
        setIsDialogOpen(false);
        return;
      }

      const result = await createService(payload);
      if (!result.success) {
        setError(result.error.message);
        return;
      }

      await loadServices(1, search, showInactive);
      setMessage("Service berhasil dibuat.");
      setIsDialogOpen(false);
    });
  };

  const submitDisableService = (serviceId: string) => {
    startTransition(async () => {
      setError(null);
      setMessage(null);

      const result = await disableService(serviceId);
      if (!result.success) {
        setError(result.error.message);
        return;
      }

      await loadServices(page, search, showInactive);
      setMessage("Service berhasil dinonaktifkan.");
    });
  };

  const submitEnableService = (serviceId: string) => {
    startTransition(async () => {
      setError(null);
      setMessage(null);

      const result = await enableService(serviceId);
      if (!result.success) {
        setError(result.error.message);
        return;
      }

      await loadServices(page, search, showInactive);
      setMessage("Service berhasil diaktifkan.");
    });
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    startTransition(() => {
      loadServices(1, value, showInactive);
    });
  };

  const handleShowInactiveChange = () => {
    setShowInactive((prev) => {
      const next = !prev;
      startTransition(() => {
        loadServices(1, search, next);
      });
      return next;
    });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > maxPage) {
      return;
    }

    startTransition(() => {
      loadServices(newPage, search, showInactive);
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Service Management</CardTitle>
            <CardDescription>Kelola layanan dan obat yang digunakan untuk invoice.</CardDescription>
          </div>
          <Button onClick={handleCreateOpen}>Tambah Service</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {message ? <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div> : null}
          {error ? <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
          {isPending ? <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">Memuat data...</div> : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Cari nama atau kategori service..."
              className="w-full rounded-md border border-slate-200 px-3 py-2 sm:max-w-md"
            />
            <label className="inline-flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={showInactive} onChange={handleShowInactiveChange} className="h-4 w-4 rounded border-slate-300 text-slate-900" />
              Tampilkan nonaktif
            </label>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-700">
                <tr>
                  <th className="px-3 py-2">Nama</th>
                  <th className="px-3 py-2">Kategori</th>
                  <th className="px-3 py-2">Harga</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {services.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                      Tidak ada service.
                    </td>
                  </tr>
                ) : (
                  services.map((service) => (
                    <tr key={service.id} className="border-t border-slate-200">
                      <td className="px-3 py-2">{service.name}</td>
                      <td className="px-3 py-2">{service.category}</td>
                      <td className="px-3 py-2">Rp {service.price.toLocaleString("id-ID")}</td>
                      <td className="px-3 py-2">{service.isActive ? "Aktif" : "Nonaktif"}</td>
                      <td className="flex flex-wrap gap-2 px-3 py-2">
                        <Button size="sm" variant="outline" onClick={() => handleEditOpen(service)}>Edit</Button>
                        {service.isActive ? (
                          <Button size="sm" variant="outline" onClick={() => submitDisableService(service.id)}>Nonaktif</Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => submitEnableService(service.id)}>Aktifkan</Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="text-sm text-slate-500">Total service: {total}</div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => handlePageChange(page - 1)}>
                Sebelumnya
              </Button>
              <Button size="sm" variant="outline" disabled={page >= maxPage} onClick={() => handlePageChange(page + 1)}>
                Selanjutnya
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={(value) => { setIsDialogOpen(value); if (!value) resetDraft(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Service" : "Tambah Service"}</DialogTitle>
            <DialogDescription>{isEditMode ? "Perbarui detail service." : "Tambahkan service baru untuk invoice dan medical record."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Nama</label>
              <input
                value={draft.name}
                onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-md border border-slate-200 px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Kategori</label>
              <input
                value={draft.category}
                onChange={(e) => setDraft((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full rounded-md border border-slate-200 px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Harga (Rupiah)</label>
              <input
                type="number"
                min={0}
                value={draft.price}
                onChange={(e) => setDraft((prev) => ({ ...prev, price: e.target.value }))}
                className="w-full rounded-md border border-slate-200 px-3 py-2"
              />
            </div>
          </div>
          {error ? <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetDraft(); setIsDialogOpen(false); }}>Batal</Button>
            <Button onClick={submitCreateOrUpdate} disabled={isPending}>{isEditMode ? "Simpan" : "Buat"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
