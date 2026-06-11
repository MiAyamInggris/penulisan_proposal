"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  bulkImportHistoricalQuota,
  type HistoricalQuotaImportResult,
} from "@/lib/actions/historical-quota-import";

function exportImportReport(result: HistoricalQuotaImportResult) {
  const data = result.rows.map((r) => ({
    Baris: r.row,
    NIM: r.nim,
    Nama: r.nama,
    "Program Studi": r.prodi,
    Status: r.status,
    Keterangan: r.reason ?? "",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const colWidths = Object.keys(data[0] ?? {}).map((key) => ({
    wch: Math.max(key.length, ...data.map((r) => String((r as unknown as Record<string, string>)[key] ?? "").length)) + 2,
  }));
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Laporan Import");
  XLSX.writeFile(wb, `laporan-import-ta2-${result.importBatchId}.xlsx`);
}

export function HistoricalQuotaImportClient() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HistoricalQuotaImportResult | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setResult(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await bulkImportHistoricalQuota(fd);
      setResult(res);

      if (res.imported > 0) {
        let msg = `${res.imported} mahasiswa berhasil diimpor ke Tugas Akhir - Past`;
        if (res.missingPembimbing > 0) msg += ` (${res.missingPembimbing} belum punya pembimbing)`;
        if (res.skippedExisting > 0) msg += `, ${res.skippedExisting} dilewati (NIM sudah ada)`;
        toast.success(msg);
        router.refresh();
      } else if (res.invalidData + res.failedRows === res.total) {
        toast.error("Semua baris gagal diproses");
      } else if (res.skippedExisting === res.total) {
        toast.warning("Semua baris dilewati karena NIM sudah terdaftar");
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
          <p className="font-semibold">Import Kuota Historis TA2 (&ldquo;Tugas Akhir - Past&rdquo;)</p>
          <p className="mt-0.5">
            Gunakan fitur ini hanya untuk mendaftarkan mahasiswa yang sudah ada
            sebelum sistem ini digunakan, agar beban bimbingan dosen dihitung
            dengan akurat. Fitur ini TIDAK mengubah nilai, kelas proposal aktif,
            seminar, desk evaluation, atau Rekap Nilai.
          </p>
        </div>
      </div>

      {/* Step 1: Download template */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Langkah 1 — Unduh Template Excel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500">
            Unduh template, isi data mahasiswa, lalu upload kembali.
            Sheet <strong>Petunjuk</strong> berisi penjelasan setiap kolom.
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-gray-600">
            <Badge variant="outline">NIM *</Badge>
            <Badge variant="outline">Nama Mahasiswa *</Badge>
            <Badge variant="outline">Program Studi *</Badge>
            <Badge variant="outline">Kode Pembimbing 1</Badge>
            <Badge variant="outline">Kode Pembimbing 2</Badge>
          </div>
          <p className="text-xs text-gray-400">
            Kode Pembimbing 1 &amp; 2 boleh dikosongkan — mahasiswa tetap
            diimpor dengan status &ldquo;Belum Ditetapkan&rdquo; dan dapat
            ditugaskan kemudian melalui menu Mahasiswa Belum Memiliki
            Pembimbing. NIM yang sudah terdaftar akan dilewati (tidak menimpa
            data).
          </p>
          <a href="/api/ketua-kk/historical-quota-template" download>
            <Button type="button" variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Unduh Template Excel
            </Button>
          </a>
        </CardContent>
      </Card>

      {/* Step 2: Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Langkah 2 — Upload File</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500">
            Upload file Excel (.xlsx) yang sudah diisi. Setiap mahasiswa akan
            otomatis ditempatkan di kelas sistem &ldquo;Tugas Akhir - Past&rdquo; sesuai
            Program Studi-nya.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFile}
            disabled={loading}
          />
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => inputRef.current?.click()}
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Hasil Import</CardTitle>
            {result.rows.length > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={() => exportImportReport(result)}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export Laporan
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="text-center rounded-lg bg-gray-50 p-3">
                <p className="text-2xl font-bold text-gray-900">{result.total}</p>
                <p className="text-xs text-gray-500 mt-0.5">Total Baris</p>
              </div>
              <div className="text-center rounded-lg bg-green-50 p-3">
                <p className="text-2xl font-bold text-green-700">{result.imported}</p>
                <p className="text-xs text-green-600 mt-0.5">Imported</p>
              </div>
              <div className="text-center rounded-lg bg-amber-50 p-3">
                <p className="text-2xl font-bold text-amber-700">{result.missingPembimbing}</p>
                <p className="text-xs text-amber-600 mt-0.5">Missing Pembimbing</p>
              </div>
              <div className="text-center rounded-lg bg-blue-50 p-3">
                <p className="text-2xl font-bold text-blue-700">{result.skippedExisting}</p>
                <p className="text-xs text-blue-600 mt-0.5">Skipped Existing</p>
              </div>
              <div className="text-center rounded-lg bg-orange-50 p-3">
                <p className="text-2xl font-bold text-orange-700">{result.invalidData}</p>
                <p className="text-xs text-orange-600 mt-0.5">Invalid Data</p>
              </div>
              <div className="text-center rounded-lg bg-red-50 p-3">
                <p className="text-2xl font-bold text-red-700">{result.failedRows}</p>
                <p className="text-xs text-red-600 mt-0.5">Failed Rows</p>
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

            {result.imported > 0 && result.invalidData === 0 && result.failedRows === 0 && result.warnings.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                Import selesai tanpa error. Data kuota historis telah tersimpan.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
