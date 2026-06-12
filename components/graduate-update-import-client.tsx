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
  previewGraduateUpdateImport,
  commitGraduateUpdateImport,
  type GraduatePreviewResult,
  type GraduatePreviewRow,
  type GraduateCommitResult,
} from "@/lib/actions/graduate-update-import";

export type GraduateBatchRow = {
  id: string;
  createdAt: string;
  importedBy: string;
  total: number;
  graduated: number;
  skipped: number;
  failed: number;
};

function exportPreviewReport(result: GraduatePreviewResult) {
  const data = result.rows.map((r) => ({
    Baris: r.row,
    NIM: r.nim,
    Nama: r.studentName ?? r.namaInput,
    "Kode Pembimbing 1": r.kodePembimbing1,
    "Kode Pembimbing 2": r.kodePembimbing2,
    "Tanggal Yudisium": r.tanggalYudisium ? new Date(r.tanggalYudisium).toLocaleDateString("id-ID") : "",
    Status: r.status,
    Keterangan: r.reason ?? "",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const colWidths = Object.keys(data[0] ?? {}).map((key) => ({
    wch: Math.max(key.length, ...data.map((r) => String((r as unknown as Record<string, string>)[key] ?? "").length)) + 2,
  }));
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Preview Update Lulus");
  XLSX.writeFile(wb, `preview-update-lulus-${Date.now()}.xlsx`);
}

function exportCommitReport(result: GraduateCommitResult) {
  const data = result.rows.map((r) => ({
    Baris: r.row,
    NIM: r.nim,
    Nama: r.nama,
    Status: r.status,
    Keterangan: r.reason ?? "",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const colWidths = Object.keys(data[0] ?? {}).map((key) => ({
    wch: Math.max(key.length, ...data.map((r) => String((r as unknown as Record<string, string>)[key] ?? "").length)) + 2,
  }));
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Laporan Update Lulus");
  XLSX.writeFile(wb, `laporan-update-lulus-${result.importBatchId}.xlsx`);
}

function ImportTab() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [preview, setPreview] = useState<GraduatePreviewResult | null>(null);
  const [commitResult, setCommitResult] = useState<GraduateCommitResult | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setPreview(null);
    setCommitResult(null);

    const slowTimer = setTimeout(() => {
      toast.info("Proses memerlukan waktu lebih lama dari biasanya, mohon tunggu...");
    }, 8000);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await previewGraduateUpdateImport(fd);
      setPreview(res);

      if (res.valid === 0) {
        toast.error("Tidak ada baris valid yang dapat diproses");
      } else if (res.invalid > 0) {
        toast.warning(`${res.valid} baris valid, ${res.invalid} baris tidak valid — periksa preview sebelum konfirmasi`);
      } else {
        toast.success(`${res.valid} baris siap diimpor`);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal memproses file");
    } finally {
      clearTimeout(slowTimer);
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    const validRows = preview.rows.filter((r): r is GraduatePreviewRow => r.status === "Valid");
    if (validRows.length === 0) return;

    setCommitting(true);
    const slowTimer = setTimeout(() => {
      toast.info("Proses memerlukan waktu lebih lama dari biasanya, mohon tunggu...");
    }, 8000);

    try {
      const res = await commitGraduateUpdateImport(validRows);
      setCommitResult(res);
      if (res.graduated > 0) {
        toast.success(`${res.graduated} mahasiswa berhasil diperbarui menjadi LULUS`);
        router.refresh();
      } else {
        toast.warning("Tidak ada mahasiswa yang diperbarui");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal melakukan import");
    } finally {
      clearTimeout(slowTimer);
      setCommitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-semibold">Update Mahasiswa Lulus (Graduate Update Import)</p>
          <p className="mt-0.5">
            Gunakan fitur ini untuk memperbarui status mahasiswa yang sudah
            resmi lulus/yudisium. Kode Pembimbing 1/2 pada file harus sama
            persis dengan data assignment aktif mahasiswa. Riwayat bimbingan
            dan nilai TIDAK akan dihapus atau diubah.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Langkah 1 — Unduh Template Excel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500">
            Unduh template, isi data mahasiswa yang lulus, lalu upload kembali.
            Sheet <strong>Petunjuk</strong> berisi penjelasan setiap kolom.
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-gray-600">
            <Badge variant="outline">NIM *</Badge>
            <Badge variant="outline">Nama Mahasiswa *</Badge>
            <Badge variant="outline">Kode Pembimbing 1 *</Badge>
            <Badge variant="outline">Kode Pembimbing 2</Badge>
            <Badge variant="outline">Tanggal Yudisium *</Badge>
          </div>
          <a href="/api/ketua-kk/graduate-update-template" download>
            <Button type="button" variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Unduh Template Excel
            </Button>
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Langkah 2 — Upload &amp; Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500">
            Upload file Excel (.xlsx) yang sudah diisi. Sistem akan
            memvalidasi setiap baris tanpa menyimpan perubahan apa pun.
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
            {loading ? "Memvalidasi..." : "Pilih & Upload File Excel"}
          </Button>
        </CardContent>
      </Card>

      {preview && !commitResult && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Preview Hasil Validasi</CardTitle>
            {preview.rows.length > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={() => exportPreviewReport(preview)}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export Preview
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center rounded-lg bg-gray-50 p-3">
                <p className="text-2xl font-bold text-gray-900">{preview.total}</p>
                <p className="text-xs text-gray-500 mt-0.5">Total Baris</p>
              </div>
              <div className="text-center rounded-lg bg-green-50 p-3">
                <p className="text-2xl font-bold text-green-700">{preview.valid}</p>
                <p className="text-xs text-green-600 mt-0.5">Valid</p>
              </div>
              <div className="text-center rounded-lg bg-red-50 p-3">
                <p className="text-2xl font-bold text-red-700">{preview.invalid}</p>
                <p className="text-xs text-red-600 mt-0.5">Invalid</p>
              </div>
            </div>

            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b text-gray-500">
                    <th className="text-left py-1.5 pr-3 font-medium">Baris</th>
                    <th className="text-left py-1.5 pr-3 font-medium">NIM</th>
                    <th className="text-left py-1.5 pr-3 font-medium">Nama</th>
                    <th className="text-left py-1.5 pr-3 font-medium">Kode P1</th>
                    <th className="text-left py-1.5 pr-3 font-medium">Kode P2</th>
                    <th className="text-left py-1.5 pr-3 font-medium">Tgl Yudisium</th>
                    <th className="text-left py-1.5 pr-3 font-medium">Status</th>
                    <th className="text-left py-1.5 font-medium">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((r) => (
                    <tr key={r.row} className="border-b last:border-0">
                      <td className="py-1.5 pr-3 text-gray-500">{r.row}</td>
                      <td className="py-1.5 pr-3 font-mono text-gray-600">{r.nim}</td>
                      <td className="py-1.5 pr-3 text-gray-800">{r.studentName ?? r.namaInput}</td>
                      <td className="py-1.5 pr-3 text-gray-600">{r.kodePembimbing1}</td>
                      <td className="py-1.5 pr-3 text-gray-600">{r.kodePembimbing2}</td>
                      <td className="py-1.5 pr-3 text-gray-600">
                        {r.tanggalYudisium ? new Date(r.tanggalYudisium).toLocaleDateString("id-ID") : "—"}
                      </td>
                      <td className="py-1.5 pr-3">
                        <Badge
                          className={
                            r.status === "Valid"
                              ? "bg-green-100 text-green-800 hover:bg-green-100"
                              : "bg-red-100 text-red-800 hover:bg-red-100"
                          }
                        >
                          {r.status}
                        </Badge>
                      </td>
                      <td className="py-1.5 text-gray-500">{r.reason ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Hanya baris berstatus <strong>Valid</strong> yang akan diproses saat konfirmasi.
              </p>
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={committing || preview.valid === 0}
                className="bg-[#C8102E] hover:bg-[#a50d26]"
              >
                {committing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {committing ? "Memproses..." : `Konfirmasi Import (${preview.valid} mahasiswa)`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {commitResult && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Hasil Import</CardTitle>
            {commitResult.rows.length > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={() => exportCommitReport(commitResult)}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export Laporan
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center rounded-lg bg-gray-50 p-3">
                <p className="text-2xl font-bold text-gray-900">{commitResult.total}</p>
                <p className="text-xs text-gray-500 mt-0.5">Total Baris</p>
              </div>
              <div className="text-center rounded-lg bg-green-50 p-3">
                <p className="text-2xl font-bold text-green-700">{commitResult.graduated}</p>
                <p className="text-xs text-green-600 mt-0.5">Lulus (Berhasil)</p>
              </div>
              <div className="text-center rounded-lg bg-blue-50 p-3">
                <p className="text-2xl font-bold text-blue-700">{commitResult.skipped}</p>
                <p className="text-xs text-blue-600 mt-0.5">Dilewati</p>
              </div>
              <div className="text-center rounded-lg bg-red-50 p-3">
                <p className="text-2xl font-bold text-red-700">{commitResult.failed}</p>
                <p className="text-xs text-red-600 mt-0.5">Gagal</p>
              </div>
            </div>

            {commitResult.graduated > 0 && commitResult.failed === 0 && (
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                Status mahasiswa berhasil diperbarui. Kuota bimbingan dosen telah disesuaikan.
              </div>
            )}

            {commitResult.failed > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-700 mb-1">Gagal:</p>
                <div className="max-h-44 overflow-y-auto space-y-1">
                  {commitResult.rows
                    .filter((r) => r.status === "Failed")
                    .map((r, i) => (
                      <div key={i} className="flex items-start gap-1 rounded bg-red-50 px-2 py-1 text-xs text-red-700">
                        <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                        <span>
                          <strong>Baris {r.row}</strong> · NIM {r.nim} — {r.reason}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RiwayatTab({ batches }: { batches: GraduateBatchRow[] }) {
  if (batches.length === 0) {
    return (
      <p className="text-sm text-gray-500 px-1 py-8 text-center">
        Belum ada riwayat Update Mahasiswa Lulus.
      </p>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-gray-600">
                <th className="text-left px-4 py-3 font-medium">Tanggal</th>
                <th className="text-left px-4 py-3 font-medium">Diimpor Oleh</th>
                <th className="text-center px-4 py-3 font-medium">Total</th>
                <th className="text-center px-4 py-3 font-medium">Lulus</th>
                <th className="text-center px-4 py-3 font-medium">Dilewati</th>
                <th className="text-center px-4 py-3 font-medium">Gagal</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(b.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{b.importedBy}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{b.total}</td>
                  <td className="px-4 py-3 text-center font-semibold text-green-700">{b.graduated}</td>
                  <td className="px-4 py-3 text-center text-blue-700">{b.skipped}</td>
                  <td className="px-4 py-3 text-center text-red-700">{b.failed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function GraduateUpdateClient({ batches }: { batches: GraduateBatchRow[] }) {
  const [tab, setTab] = useState<"import" | "riwayat">("import");

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setTab("import")}
          className={`px-4 py-1.5 text-sm font-medium rounded-t border-b-2 transition-colors ${
            tab === "import"
              ? "border-[#C8102E] text-[#C8102E]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Import
        </button>
        <button
          onClick={() => setTab("riwayat")}
          className={`px-4 py-1.5 text-sm font-medium rounded-t border-b-2 transition-colors ${
            tab === "riwayat"
              ? "border-[#C8102E] text-[#C8102E]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Riwayat ({batches.length})
        </button>
      </div>

      {tab === "import" ? <ImportTab /> : <RiwayatTab batches={batches} />}
    </div>
  );
}
