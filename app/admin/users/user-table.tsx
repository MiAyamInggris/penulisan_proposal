"use client";

import { useEffect, useMemo, useState } from "react";
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
import { createUser, updateUser, toggleUserActive, toggleKetua } from "./actions";
import { getDosenWorkloadDetail, type DosenWorkloadDetail } from "@/lib/actions/admin-user-detail";
import { ImportMahasiswaDialog } from "./import-dialog";
import { Plus, Pencil, PowerOff, Power, Upload, Crown, ShieldCheck, Eye, Loader2 } from "lucide-react";
import { Role } from "@prisma/client";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  identifier: string;
  isActive: boolean;
  isKetua: boolean;
  isKaprodi: boolean;
  kodeDosen: string | null;
  kelompokKeahlianId: string | null;
  kelompokKeahlianNama: string | null;
  prodiId: string | null;
  prodiName: string | null;
  createdAt: Date;
};

type KKOption = { id: string; nama: string };
type ProgramOption = { id: string; name: string; code: string };

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "ADMIN", label: "Admin" },
  { value: "DOSEN", label: "Dosen" },
  { value: "MAHASISWA", label: "Mahasiswa" },
];

const ROLE_FILTER_OPTIONS = [
  { value: "ALL", label: "Semua" },
  { value: "ADMIN", label: "Admin" },
  { value: "DOSEN", label: "Dosen" },
  { value: "MAHASISWA", label: "Mahasiswa" },
  { value: "KETUA_KK", label: "Ketua KK" },
  { value: "KAPRODI", label: "Kaprodi" },
];

function RolesBadges({ user }: { user: UserRow }) {
  if (user.role === "ADMIN") {
    return <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">Admin</span>;
  }
  if (user.role === "MAHASISWA") {
    return <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Mahasiswa</span>;
  }
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">Pembimbing</span>
      {user.isKetua && (
        <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 flex items-center gap-1">
          <Crown className="h-3 w-3" /> Ketua KK
        </span>
      )}
      {user.isKaprodi && (
        <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 flex items-center gap-1">
          <ShieldCheck className="h-3 w-3" /> Kaprodi
        </span>
      )}
    </div>
  );
}

function UserFormDialog({
  user,
  kkList,
  programList,
  onClose,
}: {
  user?: UserRow;
  kkList: KKOption[];
  programList: ProgramOption[];
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role>(user?.role ?? "MAHASISWA");
  const [kelompokKeahlianId, setKelompokKeahlianId] = useState(user?.kelompokKeahlianId ?? "");
  const [prodiId, setProdiId] = useState(user?.prodiId ?? "");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("role", selectedRole);
    if (selectedRole === "DOSEN") {
      formData.set("kelompokKeahlianId", kelompokKeahlianId);
      formData.set("prodiId", prodiId);
    }
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
        <Select value={selectedRole} onValueChange={(v) => { if (v) setSelectedRole(v as Role); }}>
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

      {selectedRole === "DOSEN" && (
        <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="space-y-1">
            <Label htmlFor="kodeDosen">Kode Dosen</Label>
            <Input id="kodeDosen" name="kodeDosen" defaultValue={user?.kodeDosen ?? ""} placeholder="contoh: IF123" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Program Studi</Label>
              <Select value={prodiId || "none"} onValueChange={(v) => { if (v) setProdiId(v === "none" ? "" : v); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Program Studi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">– Tidak ada –</SelectItem>
                  {programList.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} ({p.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Kelompok Keahlian</Label>
              <Select value={kelompokKeahlianId || "none"} onValueChange={(v) => { if (v) setKelompokKeahlianId(v === "none" ? "" : v); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Kelompok Keahlian" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">– Tidak ada –</SelectItem>
                  {kkList.map((kk) => (
                    <SelectItem key={kk.id} value={kk.id}>{kk.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

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

function UserDetailDialog({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const [detail, setDetail] = useState<DosenWorkloadDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDosenWorkloadDetail(user.id)
      .then(setDetail)
      .catch(() => toast.error("Gagal memuat data beban dosen"))
      .finally(() => setLoading(false));
  }, [user.id]);

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {user.isKetua && <Crown className="h-4 w-4 text-yellow-500 shrink-0" />}
            {user.name}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <span className="text-gray-500">Email</span>
          <span className="font-medium">{user.email}</span>
          <span className="text-gray-500">Kode Dosen</span>
          <span className="font-mono">{user.kodeDosen ?? "—"}</span>
          <span className="text-gray-500">Program Studi</span>
          <span>{user.prodiName ?? "—"}</span>
          <span className="text-gray-500">Kelompok Keahlian</span>
          <span>{user.kelompokKeahlianNama ?? "—"}</span>
          <span className="text-gray-500">Roles</span>
          <RolesBadges user={user} />
        </div>

        <div className="border-t pt-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Beban Kerja
          </p>
          {loading ? (
            <div className="flex items-center justify-center py-6 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : detail ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center rounded-lg bg-gray-50 p-3">
                <p className="text-xl font-bold text-gray-900">{detail.globalQuota}</p>
                <p className="text-xs text-gray-500 mt-0.5">Kuota Aktif</p>
              </div>
              <div className="text-center rounded-lg bg-gray-50 p-3">
                <p className="text-xl font-bold text-gray-700">{detail.historicalCount}</p>
                <p className="text-xs text-gray-500 mt-0.5">Historical TA2</p>
              </div>
              <div className="text-center rounded-lg bg-blue-50 p-3">
                <p className="text-xl font-bold text-blue-700">{detail.activeCount}</p>
                <p className="text-xs text-blue-600 mt-0.5">Active Proposal</p>
              </div>
              <div className="text-center rounded-lg bg-rose-50 p-3">
                <p className="text-xl font-bold text-rose-700">{detail.pengujiCount}</p>
                <p className="text-xs text-rose-600 mt-0.5">Assigned Penguji</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">Gagal memuat data.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function UserTable({
  users,
  kelompokKeahlianList,
  programList,
}: {
  users: UserRow[];
  kelompokKeahlianList: KKOption[];
  programList: ProgramOption[];
}) {
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | undefined>();
  const [detailUser, setDetailUser] = useState<UserRow | undefined>();
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [filterKK, setFilterKK] = useState<string>("ALL");

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

  const handleToggleKetua = async (user: UserRow) => {
    const res = await toggleKetua(user.id, !user.isKetua);
    if ("error" in res) toast.error(res.error);
    else toast.success(user.isKetua ? "Status Ketua KK dicabut" : "Dosen dijadikan Ketua KK");
  };

  const columns: ColumnDef<UserRow>[] = [
    { accessorKey: "name", header: "Nama" },
    { accessorKey: "email", header: "Email" },
    {
      accessorKey: "kodeDosen",
      header: "Kode Dosen",
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.kodeDosen ?? "—"}</span>,
    },
    {
      accessorKey: "prodiName",
      header: "Program Studi",
      cell: ({ row }) => row.original.prodiName ?? <span className="text-gray-400">—</span>,
    },
    {
      accessorKey: "kelompokKeahlianNama",
      header: "Kelompok Keahlian",
      cell: ({ row }) => row.original.kelompokKeahlianNama ?? <span className="text-gray-400">—</span>,
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
      id: "roles",
      header: "Roles",
      cell: ({ row }) => <RolesBadges user={row.original} />,
    },
    {
      id: "actions",
      header: "Aksi",
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setDetailUser(row.original)} title="Lihat detail">
            <Eye className="h-4 w-4 text-gray-500" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openEdit(row.original)} title="Edit">
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
          {row.original.role === "DOSEN" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleToggleKetua(row.original)}
              title={row.original.isKetua ? "Cabut Ketua KK" : "Jadikan Ketua KK"}
            >
              <Crown className={`h-4 w-4 ${row.original.isKetua ? "text-yellow-500" : "text-gray-300"}`} />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const filteredUsers = useMemo(() => {
    let result = users;
    if (activeTab === "KETUA_KK") result = result.filter((u) => u.role === "DOSEN" && u.isKetua);
    else if (activeTab === "KAPRODI") result = result.filter((u) => u.role === "DOSEN" && u.isKaprodi);
    else if (activeTab !== "ALL") result = result.filter((u) => u.role === activeTab);

    if (filterKK !== "ALL") result = result.filter((u) => u.kelompokKeahlianId === filterKK);

    return result;
  }, [users, activeTab, filterKK]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {ROLE_FILTER_OPTIONS.map((opt) => {
            const count =
              opt.value === "ALL" ? users.length
              : opt.value === "KETUA_KK" ? users.filter((u) => u.role === "DOSEN" && u.isKetua).length
              : opt.value === "KAPRODI" ? users.filter((u) => u.role === "DOSEN" && u.isKaprodi).length
              : users.filter((u) => u.role === opt.value).length;
            return (
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
                <span className="ml-2 text-xs opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import Mahasiswa
          </Button>
          <Button className="bg-[#C8102E] hover:bg-[#a50d26]" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Pengguna
          </Button>
        </div>
        <ImportMahasiswaDialog open={importOpen} onClose={() => setImportOpen(false)} />
        <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editUser ? "Edit Pengguna" : "Tambah Pengguna Baru"}
              </DialogTitle>
            </DialogHeader>
            <UserFormDialog
              key={editUser?.id ?? "new"}
              user={editUser}
              kkList={kelompokKeahlianList}
              programList={programList}
              onClose={closeDialog}
            />
          </DialogContent>
        </Dialog>
        {detailUser && (
          <UserDetailDialog user={detailUser} onClose={() => setDetailUser(undefined)} />
        )}
      </div>

      {kelompokKeahlianList.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Filter Kelompok Keahlian:</span>
          <Select value={filterKK} onValueChange={(v) => { if (v) setFilterKK(v); }}>
            <SelectTrigger className="w-56 h-8 text-sm">
              <SelectValue placeholder="Semua Kelompok Keahlian" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Kelompok Keahlian</SelectItem>
              {kelompokKeahlianList.map((kk) => (
                <SelectItem key={kk.id} value={kk.id}>{kk.nama}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <DataTable
        columns={columns}
        data={filteredUsers}
        searchPlaceholder="Cari nama, email, atau kode dosen..."
      />
    </div>
  );
}
