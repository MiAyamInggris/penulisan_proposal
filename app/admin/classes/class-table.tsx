"use client";

import { useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { createClass, updateClass } from "./actions";
import { Plus, Pencil } from "lucide-react";

type ClassRow = {
  id: string;
  code: string;
  name: string;
  semester: string;
  academicYear: string;
  programId: string;
  dosenKelasId: string;
  program: { id: string; code: string; name: string };
  dosenKelas: { id: string; name: string };
  _count: { enrollments: number };
};

type Program = { id: string; code: string; name: string };
type DosenKelas = { id: string; name: string };

function ClassFormDialog({
  editClass,
  programs,
  dosenKelasUsers,
  onClose,
}: {
  editClass?: ClassRow;
  programs: Program[];
  dosenKelasUsers: DosenKelas[];
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [programId, setProgramId] = useState(editClass?.programId ?? "");
  const [dosenKelasId, setDosenKelasId] = useState(editClass?.dosenKelasId ?? "");
  const [semester, setSemester] = useState(editClass?.semester ?? "");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("programId", programId);
    formData.set("dosenKelasId", dosenKelasId);
    formData.set("semester", semester);
    try {
      if (editClass) {
        await updateClass(editClass.id, formData);
        toast.success("Kelas berhasil diperbarui");
      } else {
        await createClass(formData);
        toast.success("Kelas berhasil dibuat");
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
          <Label>Kode Kelas</Label>
          <Input name="code" defaultValue={editClass?.code} placeholder="CCH4A3" required />
        </div>
        <div className="space-y-1">
          <Label>Nama Kelas</Label>
          <Input name="name" defaultValue={editClass?.name} placeholder="Penulisan Proposal TA A" required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Semester</Label>
          <Select value={semester} onValueChange={setSemester}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih semester" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Ganjil">Ganjil</SelectItem>
              <SelectItem value="Genap">Genap</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Tahun Akademik</Label>
          <Input name="academicYear" defaultValue={editClass?.academicYear} placeholder="2024/2025" required />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Program Studi</Label>
        <Select value={programId} onValueChange={setProgramId}>
          <SelectTrigger>
            <SelectValue placeholder="Pilih prodi" />
          </SelectTrigger>
          <SelectContent>
            {programs.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.code} – {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Dosen Kelas</Label>
        <Select value={dosenKelasId} onValueChange={setDosenKelasId}>
          <SelectTrigger>
            <SelectValue placeholder="Pilih dosen kelas" />
          </SelectTrigger>
          <SelectContent>
            {dosenKelasUsers.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
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
        {loading ? "Menyimpan..." : editClass ? "Perbarui Kelas" : "Buat Kelas"}
      </Button>
    </form>
  );
}

export function ClassTable({
  classes,
  programs,
  dosenKelasUsers,
}: {
  classes: ClassRow[];
  programs: Program[];
  dosenKelasUsers: DosenKelas[];
}) {
  const [open, setOpen] = useState(false);
  const [editClass, setEditClass] = useState<ClassRow | undefined>();

  const openCreate = () => { setEditClass(undefined); setOpen(true); };
  const openEdit = (cls: ClassRow) => { setEditClass(cls); setOpen(true); };
  const closeDialog = () => { setOpen(false); setEditClass(undefined); };

  const columns: ColumnDef<ClassRow>[] = [
    { accessorKey: "code", header: "Kode" },
    { accessorKey: "name", header: "Nama Kelas" },
    { accessorKey: "semester", header: "Semester" },
    { accessorKey: "academicYear", header: "Tahun Akademik" },
    {
      accessorKey: "program.code",
      header: "Prodi",
      cell: ({ row }) => row.original.program.code,
    },
    {
      accessorKey: "dosenKelas.name",
      header: "Dosen Kelas",
      cell: ({ row }) => row.original.dosenKelas.name,
    },
    {
      accessorKey: "_count.enrollments",
      header: "Mahasiswa",
      cell: ({ row }) => row.original._count.enrollments,
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
          Buat Kelas
        </Button>
        <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editClass ? "Edit Kelas" : "Buat Kelas Baru"}</DialogTitle>
            </DialogHeader>
            <ClassFormDialog
              editClass={editClass}
              programs={programs}
              dosenKelasUsers={dosenKelasUsers}
              onClose={closeDialog}
            />
          </DialogContent>
        </Dialog>
      </div>
      <DataTable columns={columns} data={classes} searchPlaceholder="Cari kelas..." />
    </div>
  );
}
