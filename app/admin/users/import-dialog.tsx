"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, CheckCircle2, Download, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { importMahasiswa, type ImportResult } from "./actions";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function ImportMahasiswaDialog({ open, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setResult(null);
    onClose();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await importMahasiswa(fd);
      setResult(res);
      if (res.imported > 0) {
        toast.success(`${res.imported} mahasiswa berhasil diimpor`);
      } else {
        toast.warning("Tidak ada data baru yang diimpor");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Gagal memproses file");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Mahasiswa dari Excel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1 – download template */}
          <div className="rounded-lg border bg-gray-50 p-4">
            <p className="mb-1 text-sm font-medium">Langkah 1 — Unduh template</p>
            <p className="mb-3 text-xs text-gray-500">
              Template berisi kolom:{" "}
              <strong>nama</strong>, <strong>email</strong>, <strong>nim</strong>.
              Isi sesuai format, jangan ubah nama kolom.
            </p>
            <a href="/api/admin/import-template" download>
              <Button type="button" variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Unduh Template Excel
              </Button>
            </a>
          </div>

          {/* Step 2 – upload filled file */}
          <div className="rounded-lg border p-4">
            <p className="mb-1 text-sm font-medium">Langkah 2 — Upload file Excel</p>
            <p className="mb-3 text-xs text-gray-500">
              Password default setiap mahasiswa = NIM mereka.
              Hanya file <strong>.xlsx</strong> / <strong>.xls</strong> yang diterima.
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFile}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
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

          {/* Results */}
          {result && (
            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-sm font-semibold">Hasil Import</p>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <span className="text-gray-500">Total baris data</span>
                <span className="font-medium">{result.total}</span>

                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-4 w-4" /> Berhasil diimpor
                </span>
                <span className="font-medium text-green-700">{result.imported}</span>

                <span className="flex items-center gap-1 text-yellow-600">
                  <AlertCircle className="h-4 w-4" /> Duplikat (dilewati)
                </span>
                <span className="font-medium text-yellow-700">{result.skipped}</span>

                <span className="flex items-center gap-1 text-red-600">
                  <AlertCircle className="h-4 w-4" /> Gagal / tidak valid
                </span>
                <span className="font-medium text-red-700">{result.failed}</span>
              </div>

              {result.errors.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-medium text-gray-600">
                    Detail ({result.errors.length} baris bermasalah):
                  </p>
                  <div className="max-h-44 overflow-y-auto space-y-1">
                    {result.errors.map((err, i) => (
                      <div
                        key={i}
                        className="rounded bg-red-50 px-2 py-1 text-xs text-red-700"
                      >
                        <span className="font-medium">Baris {err.row}</span>
                        {err.nim && <span> · NIM {err.nim}</span>}
                        {err.email && <span> · {err.email}</span>}
                        {" — "}
                        {err.reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={handleClose}>
              Tutup
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
