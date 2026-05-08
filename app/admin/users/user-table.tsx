"use client";

import { useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { createUser, updateUser, toggleUserActive } from "./actions";
import { Plus, Pencil, PowerOff, Power } from "lucide-react";
import { Role } from "@prisma/client";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  identifier: string;
  isActive: boolean;
  createdAt: Date;
};

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "ADMIN", label: "Admin" },
  { value: "DOSEN", label: "Dosen" },
  { value: "MAHASISWA", label: "Mahasiswa" },
];

const ROLE_COLORS: Record<Role, string> = {
  ADMIN: "bg-red-100 text-red-700",
  DOSEN: "bg-blue-100 text-blue-700",
  MAHASISWA: "bg-green-100 text-green-700",
};

function UserFormDialog({ user, onClose }: { user?: UserRow; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role>(user?.role ?? "MAHASISWA");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("role", selectedRole);
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
      <div className="space-y-1">
        <Label>Role</Label>
        <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as Role)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-[#C8102E] hover:bg-[#a50d26]"
      >
        {loading ? "Menyimpan..." : user ? "Perbarui Pengguna" : "Buat Pengguna"}
      </Button>
    </form>
  );
}

export function UserTable({ users }: { users: UserRow[] }) {
  const [open, setOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | undefined>();
  const [activeTab, setActiveTab] = useState<string>("ALL");

  const openCreate = () => { setEditUser(undefined); setOpen(true); };
  const openEdit = (user: UserRow) => { setEditUser(user); setOpen(true); };
  const closeDialog = () => { setOpen(false); setEditUser(undefined); };

  const handleToggleActive = async (user: UserRow) => {
    try {
      await toggleUserActive(user.id, !user.isActive);
      toast.success(user.isActive ? "Pengguna dinonaktifkan" : "Pengguna diaktifkan");
    } catch {
      toast.error("Terjadi kesalahan");
    }
  };

  const columns: ColumnDef<UserRow>[] = [
    { accessorKey: "name", header: "Nama" },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "identifier", header: "NIM/NIP" },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <span
          className={`px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[row.original.role]}`}
        >
          {ROLE_OPTIONS.find((r) => r.value === row.original.role)?.label ?? row.original.role}
        </span>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "default" : "secondary"}>
          {row.original.isActive ? "Aktif" : "Nonaktif"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Aksi",
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(row.original)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleToggleActive(row.original)}
            title={row.original.isActive ? "Nonaktifkan" : "Aktifkan"}
          >
            {row.original.isActive ? (
              <PowerOff className="h-4 w-4 text-red-500" />
            ) : (
              <Power className="h-4 w-4 text-green-500" />
            )}
          </Button>
        </div>
      ),
    },
  ];

  const filteredUsers =
    activeTab === "ALL" ? users : users.filter((u) => u.role === activeTab);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {[{ value: "ALL", label: "Semua" }, ...ROLE_OPTIONS].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setActiveTab(opt.value)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === opt.value
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {opt.label}
              <span className="ml-2 text-xs opacity-70">
                (
                {opt.value === "ALL"
                  ? users.length
                  : users.filter((u) => u.role === opt.value).length}
                )
              </span>
            </button>
          ))}
        </div>
        <Button className="bg-[#C8102E] hover:bg-[#a50d26]" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Pengguna
        </Button>
        <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editUser ? "Edit Pengguna" : "Tambah Pengguna Baru"}
              </DialogTitle>
            </DialogHeader>
            <UserFormDialog user={editUser} onClose={closeDialog} />
          </DialogContent>
        </Dialog>
      </div>
      <DataTable
        columns={columns}
        data={filteredUsers}
        searchPlaceholder="Cari pengguna..."
      />
    </div>
  );
}
