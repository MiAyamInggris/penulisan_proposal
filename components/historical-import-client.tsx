"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Loader2,
  Upload,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { bulkImportHistorical, type HistoricalImportResult } from "@/lib/actions/historical-import";

type ClassOption = {
  id: string;
  code: string;
  name: string;
  semester: string;
  academicYear: string;
  program?: { code: string };
};

export function HistoricalImportClient({ classes }: { classes: ClassOption[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HistoricalImportResult | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!selectedClassId) {
      toast.error("Pilih kelas terlebih dahulu");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await bulkImportHistorical(selectedClassId, fd);
      setResult(res);

      if (res.enrolled > 0) {
        toast.success(`${res.enrolled} mahasiswa berhasil diimpor sebagai data historis`);
        router.refresh();
      } else if (res.failed === 0 && res.skipped === res.total) {
        toast.warning("Semua baris dilewati — mungkin sudah ada data aktif");
      } else {
        toast.warning("Import selesai dengan beberapa peringatan");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal memproses file");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Warning banner */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-semibold">Fitur Import Data Historis</p>
          <p className="mt-0.5">
            Gunakan fitur ini hanya untuk memasukkan data akademik semester/tahun
            lalu. Data aktif yang sedang berjalan tidak akan terpengaruh.
            Mahasiswa yang sudah memiliki proposal aktif di kelas yang dipilih
            akan dilewati secara otomatis.
          </p>
        </div>
      </div>

      {/* Step 1: Select class */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Langkah 1 — Pilih Kelas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500">
            Pilih kelas tujuan.
          </p>
          <Select value={selectedClassId} onValueChange={(v) => { if (v) setSelectedClassId(v); }}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Pilih kelas..." />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.program ? `${c.program.code} · ` : ""}
                  {c.code} — {c.semester} / {c.academicYear}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedClassId && (
            <p className="text-xs text-green-600">
              ✓ Kelas dipilih:{" "}
              <span className="font-semibold">
                {classes.find((c) => c.id === selectedClassId)?.code}
              </span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Download template */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Langkah 2 — Unduh Template Excel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500">
            Unduh template, isi data historis mahasiswa, lalu upload kembali.
            Sheet <strong>Petunjuk</strong> berisi penjelasan setiap kolom.
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-gray-600">
            <Badge variant="outline">NIM *</Badge>
            <Badge variant="outline">Nama Mahasiswa *</Badge>
            <Badge variant="outline">Judul Proposal</Badge>
            <Badge variant="outline">Pembimbing 1</Badge>
            <Badge variant="outline">Pembimbing 2</Badge>
            <Badge variant="outline">Desk Evaluator</Badge>
            <Badge variant="outline">Nilai Bimbingan P1</Badge>
            <Badge variant="outline">Nilai Bimbingan P2</Badge>
            <Badge variant="outline">Nilai LR P1</Badge>
            <Badge variant="outline">Nilai LR P2</Badge>
            <Badge variant="outline">Nilai Presentasi P1</Badge>
            <Badge variant="outline">Nilai Presentasi P2</Badge>
            <Badge variant="outline">Nilai Desk Evaluation</Badge>
          </div>
          <a href="/api/kaprodi/historical-template" download>
            <Button type="button" variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Unduh Template Excel
            </Button>
          </a>
        </CardContent>
      </Card>

      {/* Step 3: Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Langkah 3 — Upload File</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500">
            Upload file Excel (.xlsx) yang sudah diisi. Nilai per komponen dihitung dari
            rata-rata Pembimbing 1 dan 2, lalu nilai akhir dihitung otomatis berdasarkan
            bobot Program Studi.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFile}
            disabled={loading || !selectedClassId}
          />
          <Button
            type="button"
            variant="outline"
            disabled={loading || !selectedClassId}
            onClick={() => inputRef.current?.click()}
            title={!selectedClassId ? "Pilih kelas terlebih dahulu" : undefined}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {loading ? "Memproses..." : "Pilih & Upload File Excel"}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hasil Import</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center rounded-lg bg-gray-50 p-3">
                <p className="text-2xl font-bold text-gray-900">{result.total}</p>
                <p className="text-xs text-gray-500 mt-0.5">Total Baris</p>
              </div>
              <div className="text-center rounded-lg bg-green-50 p-3">
                <p className="text-2xl font-bold text-green-700">{result.enrolled}</p>
                <p className="text-xs text-green-600 mt-0.5">Berhasil</p>
              </div>
              <div className="text-center rounded-lg bg-yellow-50 p-3">
                <p className="text-2xl font-bold text-yellow-700">{result.skipped}</p>
                <p className="text-xs text-yellow-600 mt-0.5">Dilewati</p>
              </div>
              <div className="text-center rounded-lg bg-red-50 p-3">
                <p className="text-2xl font-bold text-red-700">{result.failed}</p>
                <p className="text-xs text-red-600 mt-0.5">Gagal</p>
              </div>
            </div>

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-amber-700 mb-1">
                  Peringatan ({result.warnings.length}):
                </p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {result.warnings.map((w, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-1 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800"
                    >
                      <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                      {w}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Errors */}
            {result.errors.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-700 mb-1">
                  Error / Dilewati ({result.errors.length}):
                </p>
                <div className="max-h-44 overflow-y-auto space-y-1">
                  {result.errors.map((err, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-1 rounded bg-red-50 px-2 py-1 text-xs text-red-700"
                    >
                      <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                      <span>
                        <strong>Baris {err.row}</strong>
                        {err.nim && <span> · NIM {err.nim}</span>}
                        {" — "}
                        {err.reason}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.enrolled > 0 && result.failed === 0 && result.warnings.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                Import selesai tanpa error. Data historis telah tersimpan.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
