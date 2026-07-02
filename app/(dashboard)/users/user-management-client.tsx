"use client";

import { useState, useTransition } from "react";
import { createUser, updateUser, disableUser, enableUser, resetUserPin } from "@/lib/actions/user.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

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
  currentUserId: string;
};

export function UserManagementClient({ initialUsers, currentUserId }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({ id: "", username: "", role: "DOKTER" as UserManagementUser["role"], name: "", phone: "", address: "", pin: "" });
  const [open, setOpen] = useState(false);

  const filteredUsers = users.filter((user) => {
    const q = search.toLowerCase();
    return [user.username, user.name, user.role].join(" ").toLowerCase().includes(q);
  });

  const resetForm = () => {
    setDraft({ id: "", username: "", role: "DOKTER", name: "", phone: "", address: "", pin: "" });
  };

  const submitCreate = () => {
    startTransition(async () => {
      setError(null);
      setMessage(null);
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

      setUsers((prev) => [
        {
          id: result.data.id,
          username: draft.username,
          role: draft.role,
          name: draft.name,
          phone: draft.phone || null,
          isActive: true,
          createdAt: new Date(),
          customer: null,
        },
        ...prev,
      ]);
      setMessage("User berhasil dibuat.");
      resetForm();
      setOpen(false);
    });
  };

  const submitEdit = (user: UserManagementUser) => {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      const result = await updateUser({
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        phone: user.phone || undefined,
        address: user.customer?.address || undefined,
      });

      if (!result.success) {
        setError(result.error.message);
        return;
      }

      setUsers((prev) => prev.map((item) => (item.id === user.id ? { ...item, ...user } : item)));
      setMessage("User berhasil diperbarui.");
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
          <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>Tambah User</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah User</DialogTitle>
                <DialogDescription>Isi data akun baru sesuai aturan spesifikasi.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Username</label>
                  <input value={draft.username} onChange={(e) => setDraft((prev) => ({ ...prev, username: e.target.value }))} className="w-full rounded-md border border-slate-200 px-3 py-2" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">PIN</label>
                  <input type="password" value={draft.pin} onChange={(e) => setDraft((prev) => ({ ...prev, pin: e.target.value }))} className="w-full rounded-md border border-slate-200 px-3 py-2" />
                </div>
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
                <Button variant="outline" onClick={() => { resetForm(); setOpen(false); }}>Batal</Button>
                <Button onClick={submitCreate} disabled={isPending}>Simpan</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-4">
          {message ? <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div> : null}
          {error ? <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari user..." className="w-full rounded-md border border-slate-200 px-3 py-2" />
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
                {filteredUsers.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">Belum ada user.</td></tr>
                ) : filteredUsers.map((user) => (
                  <tr key={user.id} className="border-t border-slate-200">
                    <td className="px-3 py-2">{user.username}</td>
                    <td className="px-3 py-2">{user.name}</td>
                    <td className="px-3 py-2">{user.role}</td>
                    <td className="px-3 py-2">{user.isActive ? "Aktif" : "Nonaktif"}</td>
                    <td className="space-x-2 px-3 py-2">
                      <Button size="sm" variant="outline" onClick={() => submitEdit(user)}>Edit</Button>
                      {user.isActive ? (
                        <Button size="sm" variant="outline" onClick={async () => { const result = await disableUser(user.id, currentUserId); if (result.success) { setUsers((prev) => prev.map((item) => item.id === user.id ? { ...item, isActive: false } : item)); setMessage("User dinonaktifkan."); } else { setError(result.error.message); } }}>Nonaktif</Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={async () => { const result = await enableUser(user.id); if (result.success) { setUsers((prev) => prev.map((item) => item.id === user.id ? { ...item, isActive: true } : item)); setMessage("User diaktifkan."); } else { setError(result.error.message); } }}>Aktif</Button>
                      )}
                      <Button size="sm" variant="outline" onClick={async () => { const result = await resetUserPin(user.id, "123456"); if (result.success) { setMessage("PIN berhasil direset."); } else { setError(result.error.message); } }}>Reset PIN</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
