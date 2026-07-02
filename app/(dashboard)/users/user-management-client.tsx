"use client";

import { useState, useTransition } from "react";
import { createUser, getUsers, updateUser, disableUser, enableUser, resetUserPin } from "@/lib/actions/user.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export type UserManagementUser = {
  id: string;
  username: string;
  role: "OWNER" | "ADMIN" | "DOKTER" | "CUSTOMER";
  name: string;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
  customer?: { id: string; address: string | null } | null;
};

type Props = {
  initialUsers: UserManagementUser[];
  initialTotal: number;
  initialPage: number;
  initialLimit: number;
  currentUserId: string;
};

export function UserManagementClient({ initialUsers, initialTotal, initialPage, initialLimit, currentUserId }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [limit] = useState(initialLimit);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({ id: "", username: "", role: "DOKTER" as UserManagementUser["role"], name: "", phone: "", address: "", pin: "" });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isResetPinOpen, setIsResetPinOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPinValue, setResetPinValue] = useState("");

  const maxPage = Math.max(1, Math.ceil(total / limit));

  const loadUsers = async (pageToLoad: number, searchQuery: string) => {
    setError(null);
    setMessage(null);
    const result = await getUsers({ page: pageToLoad, limit, search: searchQuery });
    if (!result.success) {
      setError(result.error.message);
      return;
    }

    setUsers(result.data.users);
    setTotal(result.data.total);
    setPage(pageToLoad);
  };

  const resetForm = () => {
    setDraft({ id: "", username: "", role: "DOKTER", name: "", phone: "", address: "", pin: "" });
  };

  const openCreateDialog = () => {
    resetForm();
    setIsEditMode(false);
    setIsDialogOpen(true);
  };

  const openEditDialog = (user: UserManagementUser) => {
    setDraft({
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      phone: user.phone || "",
      address: user.customer?.address || "",
      pin: "",
    });
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const openResetPinDialog = (userId: string) => {
    setResetUserId(userId);
    setResetPinValue("");
    setIsResetPinOpen(true);
  };

  const submitCreateOrEdit = () => {
    startTransition(async () => {
      setError(null);
      setMessage(null);

      if (isEditMode) {
        const result = await updateUser({
          id: draft.id,
          username: draft.username,
          role: draft.role,
          name: draft.name,
          phone: draft.phone || undefined,
          address: draft.address || undefined,
        });

        if (!result.success) {
          setError(result.error.message);
          return;
        }

        setUsers((prev) =>
          prev.map((item) =>
            item.id === draft.id
              ? {
                  ...item,
                  username: draft.username,
                  role: draft.role,
                  name: draft.name,
                  phone: draft.phone || null,
                  customer: draft.role === "CUSTOMER" ? { id: item.customer?.id ?? "", address: draft.address || null } : item.customer,
                }
              : item,
          ),
        );
        setMessage("User berhasil diperbarui.");
        setIsDialogOpen(false);
        return;
      }

      const result = await createUser({
        username: draft.username,
        pin: draft.pin,
        role: draft.role,
        name: draft.name,
        phone: draft.phone || undefined,
        address: draft.address || undefined,
      });

      if (!result.success) {
        setError(result.error.message);
        return;
      }

      await loadUsers(1, search);
      setMessage("User berhasil dibuat.");
      setIsDialogOpen(false);
    });
  };

  const submitResetPin = () => {
    if (!resetUserId) {
      setError("User tidak valid untuk reset PIN.");
      return;
    }

    startTransition(async () => {
      setError(null);
      setMessage(null);
      const result = await resetUserPin(resetUserId, resetPinValue);

      if (!result.success) {
        setError(result.error.message);
        return;
      }

      setMessage("PIN berhasil direset.");
      setIsResetPinOpen(false);
    });
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    startTransition(() => {
      loadUsers(1, value);
    });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > maxPage) {
      return;
    }
    startTransition(() => {
      loadUsers(newPage, search);
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Kelola akun Owner, Admin, Dokter, dan Customer.</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(value) => { setIsDialogOpen(value); if (!value) resetForm(); }}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>Tambah User</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{isEditMode ? "Edit User" : "Tambah User"}</DialogTitle>
                <DialogDescription>Isi data akun sesuai aturan spesifikasi.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Username</label>
                  <input value={draft.username} onChange={(e) => setDraft((prev) => ({ ...prev, username: e.target.value }))} className="w-full rounded-md border border-slate-200 px-3 py-2" />
                </div>
                {!isEditMode ? (
                  <div>
                    <label className="mb-1 block text-sm font-medium">PIN</label>
                    <input type="password" value={draft.pin} onChange={(e) => setDraft((prev) => ({ ...prev, pin: e.target.value }))} className="w-full rounded-md border border-slate-200 px-3 py-2" />
                  </div>
                ) : null}
                <div>
                  <label className="mb-1 block text-sm font-medium">Nama</label>
                  <input value={draft.name} onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))} className="w-full rounded-md border border-slate-200 px-3 py-2" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Role</label>
                  <select value={draft.role} onChange={(e) => setDraft((prev) => ({ ...prev, role: e.target.value as UserManagementUser["role"] }))} className="w-full rounded-md border border-slate-200 px-3 py-2">
                    <option value="ADMIN">ADMIN</option>
                    <option value="DOKTER">DOKTER</option>
                    <option value="CUSTOMER">CUSTOMER</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Phone</label>
                  <input value={draft.phone} onChange={(e) => setDraft((prev) => ({ ...prev, phone: e.target.value }))} className="w-full rounded-md border border-slate-200 px-3 py-2" />
                </div>
                {draft.role === "CUSTOMER" ? (
                  <div>
                    <label className="mb-1 block text-sm font-medium">Alamat</label>
                    <input value={draft.address} onChange={(e) => setDraft((prev) => ({ ...prev, address: e.target.value }))} className="w-full rounded-md border border-slate-200 px-3 py-2" />
                  </div>
                ) : null}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { resetForm(); setIsDialogOpen(false); }}>Batal</Button>
                <Button onClick={submitCreateOrEdit} disabled={isPending}>{isEditMode ? "Simpan" : "Simpan"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-4">
          {message ? <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div> : null}
          {error ? <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
          {isPending ? <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">Memuat data...</div> : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <input value={search} onChange={(e) => handleSearchChange(e.target.value)} placeholder="Cari user..." className="w-full rounded-md border border-slate-200 px-3 py-2 sm:max-w-md" />
            <div className="text-sm text-slate-500">Halaman {page} dari {maxPage}</div>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-3 py-2">Username</th>
                  <th className="px-3 py-2">Nama</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">Belum ada user.</td></tr>
                ) : users.map((user) => (
                  <tr key={user.id} className="border-t border-slate-200">
                    <td className="px-3 py-2">{user.username}</td>
                    <td className="px-3 py-2">{user.name}</td>
                    <td className="px-3 py-2">{user.role}</td>
                    <td className="px-3 py-2">{user.isActive ? "Aktif" : "Nonaktif"}</td>
                    <td className="space-x-2 px-3 py-2">
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(user)}>Edit</Button>
                      {user.isActive ? (
                        <Button size="sm" variant="outline" onClick={async () => { const result = await disableUser(user.id, currentUserId); if (result.success) { setUsers((prev) => prev.map((item) => item.id === user.id ? { ...item, isActive: false } : item)); setMessage("User dinonaktifkan."); } else { setError(result.error.message); } }}>Nonaktif</Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={async () => { const result = await enableUser(user.id); if (result.success) { setUsers((prev) => prev.map((item) => item.id === user.id ? { ...item, isActive: true } : item)); setMessage("User diaktifkan."); } else { setError(result.error.message); } }}>Aktif</Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => openResetPinDialog(user.id)}>Reset PIN</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm text-slate-500">Total user: {total}</div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => handlePageChange(page - 1)}>Sebelumnya</Button>
              <Button size="sm" variant="outline" disabled={page >= maxPage} onClick={() => handlePageChange(page + 1)}>Selanjutnya</Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <Dialog open={isResetPinOpen} onOpenChange={(value) => { setIsResetPinOpen(value); if (!value) { setResetPinValue(""); setResetUserId(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset PIN User</DialogTitle>
            <DialogDescription>Masukkan PIN baru untuk user yang dipilih.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">PIN Baru</label>
              <input type="password" value={resetPinValue} onChange={(e) => setResetPinValue(e.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-2" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetPinOpen(false)}>Batal</Button>
            <Button onClick={submitResetPin} disabled={isPending}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

