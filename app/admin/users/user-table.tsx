"use client";

import { useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createUser, updateUser } from "./actions";
import { Plus, Pencil } from "lucide-react";
import { Role } from "@prisma/client";

type UserRow = {
  id: string;
  name: string;
  email: string;
  roles: Role[];
  identifier: string;
  createdAt: Date;
};

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "ADMIN", label: "Admin" },
  { value: "DOSEN_KELAS", label: "Dosen Kelas" },
  { value: "PEMBIMBING", label: "Pembimbing" },
  { value: "MAHASISWA", label: "Mahasiswa" },
];

function UserFormDialog({
  user,
  onClose,
}: {
  user?: UserRow;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<Role[]>(user?.roles ?? []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    selectedRoles.forEach((r) => formData.append("roles", r));
    try {
      if (user) {
        await updateUser(user.id, formData);
        toast.success("Pengguna berhasil diperbarui");
      } else {
        await createUser(formData);
        toast.success("Pengguna berhasil dibuat");
      }
      onClose();
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = (role: Role) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="name">Nama Lengkap</Label>
          <Input id="name" name="name" defaultValue={user?.name} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="identifier">NIM / NIP</Label>
          <Input id="identifier" name="identifier" defaultValue={user?.identifier} required />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" defaultValue={user?.email} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="password">Password {user && "(kosongkan jika tidak diubah)"}</Label>
        <Input id="password" name="password" type="password" required={!user} />
      </div>
      <div className="space-y-2">
        <Label>Role</Label>
        <div className="flex flex-wrap gap-2">
          {ROLE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleRole(opt.value)}
              className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                selectedRoles.includes(opt.value)
                  ? "bg-[#C8102E] text-white border-[#C8102E]"
                  : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <Button type="submit" disabled={loading || selectedRoles.length === 0} className="w-full bg-[#C8102E] hover:bg-[#a50d26]">
        {loading ? "Menyimpan..." : user ? "Perbarui Pengguna" : "Buat Pengguna"}
      </Button>
    </form>
  );
}

export function UserTable({ users }: { users: UserRow[] }) {
  const [open, setOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | undefined>();

  const roleLabels: Record<string, string> = {
    ADMIN: "Admin",
    DOSEN_KELAS: "Dosen Kelas",
    PEMBIMBING: "Pembimbing",
    MAHASISWA: "Mahasiswa",
  };

  const openCreate = () => { setEditUser(undefined); setOpen(true); };
  const openEdit = (user: UserRow) => { setEditUser(user); setOpen(true); };
  const closeDialog = () => { setOpen(false); setEditUser(undefined); };

  const columns: ColumnDef<UserRow>[] = [
    { accessorKey: "name", header: "Nama" },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "identifier", header: "NIM/NIP" },
    {
      accessorKey: "roles",
      header: "Role",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.roles.map((r) => (
            <span key={r} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
              {roleLabels[r] ?? r}
            </span>
          ))}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Aksi",
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => openEdit(row.original)}>
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="bg-[#C8102E] hover:bg-[#a50d26]" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Pengguna
        </Button>
        <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editUser ? "Edit Pengguna" : "Tambah Pengguna Baru"}</DialogTitle>
            </DialogHeader>
            <UserFormDialog user={editUser} onClose={closeDialog} />
          </DialogContent>
        </Dialog>
      </div>
      <DataTable columns={columns} data={users} searchPlaceholder="Cari pengguna..." />
    </div>
  );
}
