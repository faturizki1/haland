"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createCustomer, disableCustomer, getCustomers } from "@/lib/actions/customer.actions";

export type CustomerManagementCustomer = {
  id: string;
  address: string | null;
  isActive: boolean;
  createdAt: Date;
  user: {
    id: string;
    username: string;
    name: string;
    phone: string | null;
    isActive: boolean;
  };
  pets: { id: string; name: string; species: string; gender: string; isActive: boolean }[];
};

type Props = {
  initialCustomers: CustomerManagementCustomer[];
  initialTotal: number;
  initialPage: number;
  initialLimit: number;
};

export function CustomerManagementClient({ initialCustomers, initialTotal, initialPage, initialLimit }: Props) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [limit] = useState(initialLimit);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [draft, setDraft] = useState({ username: "", pin: "", name: "", phone: "", address: "" });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const maxPage = Math.max(1, Math.ceil(total / limit));
  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) ?? null;

  const loadCustomers = async (pageToLoad: number, searchQuery: string, inactive: boolean) => {
    setError(null);
    setMessage(null);

    const result = await getCustomers({ page: pageToLoad, limit, search: searchQuery, showInactive: inactive });
    if (!result.success) {
      setError(result.error.message);
      return;
    }

    setCustomers(result.data.customers);
    setTotal(result.data.total);
    setPage(pageToLoad);
    if (selectedCustomerId) {
      setSelectedCustomerId((prev) => {
        const exists = result.data.customers.some((customer) => customer.id === prev);
        return exists ? prev : null;
      });
    }
  };

  const resetForm = () => {
    setDraft({ username: "", pin: "", name: "", phone: "", address: "" });
  };

  const submitCreateCustomer = () => {
    startTransition(async () => {
      setError(null);
      setMessage(null);

      const result = await createCustomer({
        username: draft.username,
        pin: draft.pin,
        name: draft.name,
        phone: draft.phone || undefined,
        address: draft.address || undefined,
      });

      if (!result.success) {
        setError(result.error.message);
        return;
      }

      await loadCustomers(1, search, showInactive);
      setMessage("Customer berhasil dibuat.");
      setIsDialogOpen(false);
      resetForm();
    });
  };

  const submitDisableCustomer = (customerId: string) => {
    startTransition(async () => {
      setError(null);
      setMessage(null);

      const result = await disableCustomer(customerId);
      if (!result.success) {
        setError(result.error.message);
        return;
      }

      await loadCustomers(page, search, showInactive);
      setMessage("Customer berhasil dinonaktifkan.");
    });
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    startTransition(() => {
      loadCustomers(1, value, showInactive);
    });
  };

  const handleShowInactiveChange = () => {
    setShowInactive((prev) => {
      const next = !prev;
      startTransition(() => {
        loadCustomers(1, search, next);
      });
      return next;
    });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > maxPage) {
      return;
    }
    startTransition(() => {
      loadCustomers(newPage, search, showInactive);
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Customer Management</CardTitle>
            <CardDescription>Kelola akun Customer beserta data alamat dan daftar pet.</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(value) => { setIsDialogOpen(value); if (!value) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>Tambah Customer</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Customer</DialogTitle>
                <DialogDescription>Tambahkan akun customer baru dengan detail alamat.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Username</label>
                  <input value={draft.username} onChange={(e) => setDraft((prev) => ({ ...prev, username: e.target.value }))} className="w-full rounded-md border border-slate-200 px-3 py-2" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">PIN Awal</label>
                  <input type="password" value={draft.pin} onChange={(e) => setDraft((prev) => ({ ...prev, pin: e.target.value }))} className="w-full rounded-md border border-slate-200 px-3 py-2" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Nama</label>
                  <input value={draft.name} onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))} className="w-full rounded-md border border-slate-200 px-3 py-2" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Telepon</label>
                  <input value={draft.phone} onChange={(e) => setDraft((prev) => ({ ...prev, phone: e.target.value }))} className="w-full rounded-md border border-slate-200 px-3 py-2" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Alamat</label>
                  <input value={draft.address} onChange={(e) => setDraft((prev) => ({ ...prev, address: e.target.value }))} className="w-full rounded-md border border-slate-200 px-3 py-2" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { resetForm(); setIsDialogOpen(false); }}>Batal</Button>
                <Button onClick={submitCreateCustomer} disabled={isPending}>Simpan</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent className="space-y-4">
          {message ? <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div> : null}
          {error ? <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
          {isPending ? <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">Memuat data...</div> : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <input value={search} onChange={(e) => handleSearchChange(e.target.value)} placeholder="Cari customer..." className="w-full rounded-md border border-slate-200 px-3 py-2 sm:max-w-md" />
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={showInactive} onChange={handleShowInactiveChange} className="h-4 w-4 rounded border-slate-300 text-slate-900" />
                Tampilkan nonaktif
              </label>
              <span>Halaman {page} dari {maxPage}</span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-700">
                <tr>
                  <th className="px-3 py-2">Username</th>
                  <th className="px-3 py-2">Nama</th>
                  <th className="px-3 py-2">Telepon</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-slate-500">Belum ada customer.</td>
                  </tr>
                ) : (
                  customers.map((customer) => (
                    <tr key={customer.id} className="border-t border-slate-200">
                      <td className="px-3 py-2">{customer.user.username}</td>
                      <td className="px-3 py-2">{customer.user.name}</td>
                      <td className="px-3 py-2">{customer.user.phone ?? "-"}</td>
                      <td className="px-3 py-2">{customer.isActive ? "Aktif" : "Nonaktif"}</td>
                      <td className="flex flex-wrap gap-2 px-3 py-2">
                        <Button size="sm" variant="outline" onClick={() => setSelectedCustomerId(customer.id)}>Detail</Button>
                        {customer.isActive ? (
                          <Button size="sm" variant="outline" onClick={() => submitDisableCustomer(customer.id)}>Nonaktif</Button>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="text-sm text-slate-500">Total customer: {total}</div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => handlePageChange(page - 1)}>Sebelumnya</Button>
              <Button size="sm" variant="outline" disabled={page >= maxPage} onClick={() => handlePageChange(page + 1)}>Selanjutnya</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedCustomer ? (
        <Card>
          <CardHeader>
            <CardTitle>Detail Customer</CardTitle>
            <CardDescription>Informasi lengkap customer dan daftar pet miliknya.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-slate-500">Username</p>
                <p className="font-medium">{selectedCustomer.user.username}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Nama</p>
                <p className="font-medium">{selectedCustomer.user.name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Telepon</p>
                <p className="font-medium">{selectedCustomer.user.phone ?? "-"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Alamat</p>
                <p className="font-medium">{selectedCustomer.address ?? "-"}</p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between gap-4">
                <p className="text-sm font-semibold">Daftar Pet</p>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">{selectedCustomer.pets.length} pet</span>
              </div>
              {selectedCustomer.pets.length === 0 ? (
                <p className="text-sm text-slate-500">Belum ada pet untuk customer ini.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-white text-left text-slate-700">
                      <tr>
                        <th className="px-3 py-2">Nama</th>
                        <th className="px-3 py-2">Spesies</th>
                        <th className="px-3 py-2">Gender</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCustomer.pets.map((pet) => (
                        <tr key={pet.id} className="border-t border-slate-200">
                          <td className="px-3 py-2">{pet.name}</td>
                          <td className="px-3 py-2">{pet.species}</td>
                          <td className="px-3 py-2">{pet.gender}</td>
                          <td className="px-3 py-2">{pet.isActive ? "Aktif" : "Nonaktif"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setSelectedCustomerId(null)}>Tutup</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
