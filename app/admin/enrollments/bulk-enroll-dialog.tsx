"use client";

import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { bulkEnrollMahasiswa, type BulkEnrollResult } from "./actions";

type ClassOption = {
  id: string;
  code: string;
  name: string;
  academicYear: string;
  program: { code: string };
};

type Props = {
  open: boolean;
  onClose: () => void;
  classes: ClassOption[];
};

export function BulkEnrollDialog({ open, onClose, classes }: Props) {
  const [classId, setClassId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BulkEnrollResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setResult(null);
    setClassId("");
    onClose();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!classId) {
      toast.error("Pilih kelas terlebih dahulu");
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await bulkEnrollMahasiswa(classId, fd);
      setResult(res);
      if (res.enrolled > 0) {
        toast.success(`${res.enrolled} mahasiswa berhasil didaftarkan`);
      } else if (res.skipped > 0 && res.failed === 0) {
        toast.info("Semua mahasiswa sudah terdaftar sebelumnya");
      } else {
        toast.warning("Tidak ada mahasiswa baru yang didaftarkan");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memproses file";
      toast.error(msg);
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const selectedClass = classes.find((c) => c.id === classId);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            Import Massal Mahasiswa dari Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1 – Select class */}
          <div className="rounded-lg border bg-gray-50 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#C8102E] text-xs font-bold text-white shrink-0">
                1
              </span>
              <p className="text-sm font-medium">Pilih Kelas Target</p>
            </div>
            <Select value={classId} onValueChange={(v) => { if (v) setClassId(v); }}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih kelas..." />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code} – {c.name} ({c.program.code}, {c.academicYear})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedClass && (
              <p className="text-xs text-green-700 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Kelas dipilih: {selectedClass.code} · {selectedClass.name}
              </p>
            )}
          </div>

          {/* Step 2 – Download template */}
          <div className="rounded-lg border bg-gray-50 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#C8102E] text-xs font-bold text-white shrink-0">
                2
              </span>
              <p className="text-sm font-medium">Unduh Template Excel</p>
            </div>
            <p className="text-xs text-gray-500 ml-8">
              Template berisi kolom:{" "}
              <strong>NIM</strong>, <strong>Nama Mahasiswa</strong>,{" "}
              <strong>Program Studi</strong> (RPL / IF / DS / SI).
              <br />
              Email dan password mahasiswa akan di-generate otomatis:{" "}
              <code className="bg-gray-200 px-1 rounded text-gray-700">
                NIM@student.telkomuniversity.ac.id
              </code>
            </p>
            <div className="ml-8">
              <a href="/api/admin/enrollment-template" download>
                <Button type="button" variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Unduh Template Excel
                </Button>
              </a>
            </div>
          </div>

          {/* Step 3 – Upload */}
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#C8102E] text-xs font-bold text-white shrink-0">
                3
              </span>
              <p className="text-sm font-medium">Upload & Proses</p>
            </div>
            <div className="ml-8 space-y-2">
              <p className="text-xs text-gray-500">
                Format yang didukung: <strong>.xlsx</strong>, <strong>.xls</strong>,{" "}
                <strong>.csv</strong>. Upload akan langsung memproses dan mendaftarkan mahasiswa.
              </p>
              {!classId && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Pilih kelas terlebih dahulu sebelum upload
                </p>
              )}
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFile}
                disabled={!classId || loading}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!classId || loading}
                onClick={() => inputRef.current?.click()}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                {loading ? "Memproses..." : "Pilih & Upload File"}
              </Button>
            </div>
          </div>

          {/* Results */}
          {result && (
            <div className="rounded-lg border border-gray-200 p-4 space-y-4">
              <p className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                Hasil Import
              </p>

              {/* Summary grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <StatCard label="Total baris" value={result.total} color="gray" />
                <StatCard
                  label="Berhasil didaftarkan"
                  value={result.enrolled}
                  color="green"
                  icon={<CheckCircle2 className="h-4 w-4" />}
                />
                <StatCard
                  label="Akun baru dibuat"
                  value={result.accountsCreated}
                  color="blue"
                />
                <StatCard
                  label="Akun lama dipakai"
                  value={result.accountsReused}
                  color="indigo"
                />
                <StatCard
                  label="Duplikat (dilewati)"
                  value={result.skipped}
                  color="yellow"
                  icon={<AlertCircle className="h-4 w-4" />}
                />
                <StatCard
                  label="Gagal / tidak valid"
                  value={result.failed}
                  color="red"
                  icon={<AlertCircle className="h-4 w-4" />}
                />
              </div>

              {/* Error details */}
              {result.errors.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold text-gray-600">
                    Detail masalah ({result.errors.length} baris):
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-1 rounded-md border border-gray-100 p-2 bg-gray-50">
                    {result.errors.map((err, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-2 rounded px-2 py-1 text-xs ${
                          err.reason.includes("sudah terdaftar") ||
                          err.reason.includes("duplikat")
                            ? "bg-yellow-50 text-yellow-800"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        <span className="font-semibold shrink-0">Baris {err.row}</span>
                        {err.nim && (
                          <span className="shrink-0 text-gray-500">NIM: {err.nim}</span>
                        )}
                        <span>— {err.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.enrolled > 0 && result.failed === 0 && result.errors.length === 0 && (
                <div className="flex items-center gap-2 rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Semua data berhasil diproses tanpa error.
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={handleClose}>
              Tutup
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: "gray" | "green" | "blue" | "indigo" | "yellow" | "red";
  icon?: React.ReactNode;
}) {
  const styles = {
    gray: "bg-gray-50 border-gray-200 text-gray-700",
    green: "bg-green-50 border-green-200 text-green-700",
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    indigo: "bg-indigo-50 border-indigo-200 text-indigo-700",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-700",
    red: "bg-red-50 border-red-200 text-red-700",
  }[color];

  return (
    <div className={`rounded-lg border p-3 ${styles}`}>
      <div className="flex items-center gap-1.5 mb-1 opacity-80">
        {icon}
        <p className="text-xs">{label}</p>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
