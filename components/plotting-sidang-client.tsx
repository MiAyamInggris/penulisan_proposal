"use client";

import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertTriangle, CheckCircle2, Download, FileSpreadsheet,
  Loader2, Upload, UserCheck, AlertCircle, ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import type { ProdiCode } from "@prisma/client";
import {
  previewSidangImport,
  commitSidangImport,
  type SidangPreviewResult,
  type SidangPreviewRow,
  type SidangCommitResult,
} from "@/lib/actions/sidang-import";
import { assignPengujiSidang } from "@/lib/actions/sidang-assign";

type DosenOption = { id: string; name: string; kodeDosen: string | null };
type DosenRef = { id: string; name: string; kodeDosen: string | null } | null;

type SidangRecordSerialized = {
  id: string;
  nim: string;
  nama: string;
  prodi: ProdiCode;
  judul: string | null;
  kelompokKeilmuan: string | null;
  pembimbing1: DosenRef;
  pembimbing2: DosenRef;
  penguji1: DosenRef;
  penguji2: DosenRef;
  createdAt: string;
};

// ─── Import Sub-tab ─────────────────────────────────────────────────────────

function ImportSubTab({ method }: { method: "full" | "semi" }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [preview, setPreview] = useState<SidangPreviewResult | null>(null);
  const [commitResult, setCommitResult] = useState<SidangCommitResult | null>(null);

  const templateUrl =
    method === "full"
      ? "/api/ketua-kk/sidang-template-full"
      : "/api/ketua-kk/sidang-template-semi";

  const columns =
    method === "full"
      ? ["NIM *", "Nama Mahasiswa *", "Program Studi *", "Judul", "Kode Pembimbing 1 *", "Kode Pembimbing 2", "Kode Penguji 1 *", "Kode Penguji 2 *", "Kelompok Keilmuan"]
      : ["NIM *", "Nama Mahasiswa *", "Program Studi *", "Judul", "Kode Pembimbing 1 *", "Kode Pembimbing 2", "Kelompok Keilmuan"];

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
      const res = await previewSidangImport(fd, method);
      setPreview(res);

      if (res.valid === 0 && res.warnings === 0) {
        toast.error("Tidak ada baris valid yang dapat diproses");
      } else if (res.invalid > 0) {
        toast.warning(
          `${res.valid + res.warnings} baris valid, ${res.invalid} baris tidak valid — periksa sebelum konfirmasi`
        );
      } else {
        toast.success(`${res.valid + res.warnings} baris siap diimpor`);
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
    const importableRows = preview.rows.filter(
      (r): r is SidangPreviewRow => r.status === "Valid" || r.status === "Warning"
    );
    if (importableRows.length === 0) return;

    setCommitting(true);
    const slowTimer = setTimeout(() => {
      toast.info("Proses memerlukan waktu lebih lama dari biasanya, mohon tunggu...");
    }, 8000);

    try {
      const res = await commitSidangImport(importableRows, method);
      setCommitResult(res);
      const saved = res.created + res.updated;
      if (saved > 0) {
        toast.success(`${saved} data sidang berhasil disimpan (${res.created} baru, ${res.updated} diperbarui)`);
      } else {
        toast.warning("Tidak ada data yang disimpan");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal melakukan import");
    } finally {
      clearTimeout(slowTimer);
      setCommitting(false);
    }
  };

  const exportPreview = () => {
    if (!preview) return;
    const data = preview.rows.map((r) => ({
      Baris: r.row,
      NIM: r.nim,
      Nama: r.nama,
      Prodi: r.prodi ?? "",
      "Kode PBB 1": r.kodePembimbing1,
      "Kode PBB 2": r.kodePembimbing2,
      "Kode PGJ 1": r.kodePenguji1,
      "Kode PGJ 2": r.kodePenguji2,
      Status: r.status,
      Keterangan: r.issues.join("; "),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Preview Sidang");
    XLSX.writeFile(wb, `preview-plotting-sidang-${Date.now()}.xlsx`);
  };

  const importableCount = preview ? preview.valid + preview.warnings : 0;

  return (
    <div className="space-y-6">
      {method === "semi" && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">
            <strong>Metode 2 (Semi-otomatis):</strong> Import hanya berisi data pembimbing.
            Penguji (PGJ I & II) akan ditugaskan secara manual melalui tab{" "}
            <strong>Belum Penguji</strong> setelah import selesai.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Langkah 1 — Unduh Template Excel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500">
            Unduh template, isi data, lalu upload kembali. Sheet{" "}
            <strong>Petunjuk</strong> berisi penjelasan setiap kolom.
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-gray-600">
            {columns.map((c) => (
              <Badge key={c} variant="outline">{c}</Badge>
            ))}
          </div>
          <a href={templateUrl} download>
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
            Upload file Excel (.xlsx) yang sudah diisi. Sistem akan memvalidasi
            setiap baris tanpa menyimpan perubahan apa pun.
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
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {loading ? "Memvalidasi..." : "Pilih & Upload File Excel"}
          </Button>
        </CardContent>
      </Card>

      {preview && !commitResult && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Preview Hasil Validasi</CardTitle>
            {preview.rows.length > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={exportPreview}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export Preview
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center rounded-lg bg-gray-50 p-3">
                <p className="text-2xl font-bold text-gray-900">{preview.total}</p>
                <p className="text-xs text-gray-500 mt-0.5">Total</p>
              </div>
              <div className="text-center rounded-lg bg-green-50 p-3">
                <p className="text-2xl font-bold text-green-700">{preview.valid}</p>
                <p className="text-xs text-green-600 mt-0.5">Valid</p>
              </div>
              <div className="text-center rounded-lg bg-amber-50 p-3">
                <p className="text-2xl font-bold text-amber-700">{preview.warnings}</p>
                <p className="text-xs text-amber-600 mt-0.5">Peringatan</p>
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
                    <th className="text-left py-1.5 pr-3 font-medium">Prodi</th>
                    <th className="text-left py-1.5 pr-3 font-medium">PBB 1</th>
                    <th className="text-left py-1.5 pr-3 font-medium">PBB 2</th>
                    {method === "full" && <th className="text-left py-1.5 pr-3 font-medium">PGJ 1</th>}
                    {method === "full" && <th className="text-left py-1.5 pr-3 font-medium">PGJ 2</th>}
                    <th className="text-left py-1.5 pr-3 font-medium">Status</th>
                    <th className="text-left py-1.5 font-medium">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((r) => (
                    <tr key={r.row} className="border-b last:border-0">
                      <td className="py-1.5 pr-3 text-gray-500">{r.row}</td>
                      <td className="py-1.5 pr-3 font-mono text-gray-600">{r.nim}</td>
                      <td className="py-1.5 pr-3 text-gray-800">{r.nama}</td>
                      <td className="py-1.5 pr-3 text-gray-600">{r.prodi ?? "—"}</td>
                      <td className="py-1.5 pr-3 text-gray-600">{r.kodePembimbing1 || "—"}</td>
                      <td className="py-1.5 pr-3 text-gray-600">{r.kodePembimbing2 || "—"}</td>
                      {method === "full" && <td className="py-1.5 pr-3 text-gray-600">{r.kodePenguji1 || "—"}</td>}
                      {method === "full" && <td className="py-1.5 pr-3 text-gray-600">{r.kodePenguji2 || "—"}</td>}
                      <td className="py-1.5 pr-3">
                        <Badge
                          className={
                            r.status === "Valid"
                              ? "bg-green-100 text-green-800 hover:bg-green-100"
                              : r.status === "Warning"
                              ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
                              : "bg-red-100 text-red-800 hover:bg-red-100"
                          }
                        >
                          {r.status}
                        </Badge>
                      </td>
                      <td className="py-1.5 text-gray-500 max-w-xs truncate">{r.issues.join("; ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-gray-400">
                Baris <strong>Valid</strong> dan <strong>Peringatan</strong> akan diproses.
                Baris <strong>Invalid</strong> dilewati.
              </p>
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={committing || importableCount === 0}
                className="bg-[#C8102E] hover:bg-[#a50d26] shrink-0"
              >
                {committing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {committing ? "Memproses..." : `Konfirmasi Import (${importableCount} data)`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {commitResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hasil Import</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center rounded-lg bg-gray-50 p-3">
                <p className="text-2xl font-bold text-gray-900">{commitResult.total}</p>
                <p className="text-xs text-gray-500 mt-0.5">Total</p>
              </div>
              <div className="text-center rounded-lg bg-green-50 p-3">
                <p className="text-2xl font-bold text-green-700">{commitResult.created}</p>
                <p className="text-xs text-green-600 mt-0.5">Baru Dibuat</p>
              </div>
              <div className="text-center rounded-lg bg-blue-50 p-3">
                <p className="text-2xl font-bold text-blue-700">{commitResult.updated}</p>
                <p className="text-xs text-blue-600 mt-0.5">Diperbarui</p>
              </div>
              <div className="text-center rounded-lg bg-red-50 p-3">
                <p className="text-2xl font-bold text-red-700">{commitResult.failed}</p>
                <p className="text-xs text-red-600 mt-0.5">Gagal</p>
              </div>
            </div>
            {commitResult.created + commitResult.updated > 0 && commitResult.failed === 0 && (
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                Data sidang berhasil disimpan.
                {method === "semi" && " Buka tab Belum Penguji untuk menugaskan penguji."}
              </div>
            )}
            {commitResult.failed > 0 && (
              <div className="max-h-36 overflow-y-auto space-y-1">
                {commitResult.rows
                  .filter((r) => r.status === "Failed")
                  .map((r, i) => (
                    <div key={i} className="flex items-start gap-1 rounded bg-red-50 px-2 py-1 text-xs text-red-700">
                      <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                      <span><strong>Baris {r.row}</strong> · {r.nim} — {r.reason}</span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Import Tab (two sub-tabs) ───────────────────────────────────────────────

function ImportTab() {
  const [sub, setSub] = useState<"full" | "semi">("full");

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-semibold">Import Data Plotting Sidang</p>
          <p className="mt-0.5">
            Metode 1 (Lengkap): import pembimbing dan penguji sekaligus.
            Metode 2 (Semi-otomatis): import pembimbing dulu, penguji ditugaskan manual kemudian.
          </p>
        </div>
      </div>

      <div className="flex gap-1 border-b">
        {(["full", "semi"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setSub(m)}
            className={`px-4 py-1.5 text-sm font-medium rounded-t border-b-2 transition-colors ${
              sub === m
                ? "border-[#C8102E] text-[#C8102E]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {m === "full" ? "Metode 1 — Lengkap" : "Metode 2 — Semi-otomatis"}
          </button>
        ))}
      </div>

      <ImportSubTab key={sub} method={sub} />
    </div>
  );
}

// ─── Monitoring Tab ──────────────────────────────────────────────────────────

function MonitoringTab({ records }: { records: SidangRecordSerialized[] }) {
  const [filterProdi, setFilterProdi] = useState<string>("ALL");

  const filtered = filterProdi === "ALL" ? records : records.filter((r) => r.prodi === filterProdi);

  const exportMonitoring = () => {
    const data = filtered.map((r) => ({
      NIM: r.nim,
      Nama: r.nama,
      Prodi: r.prodi,
      Judul: r.judul ?? "",
      "Pembimbing 1": r.pembimbing1?.name ?? "—",
      "Pembimbing 2": r.pembimbing2?.name ?? "—",
      "Penguji 1": r.penguji1?.name ?? "—",
      "Penguji 2": r.penguji2?.name ?? "—",
      "Kelompok Keilmuan": r.kelompokKeilmuan ?? "",
      "Status Penguji": r.penguji1 && r.penguji2 ? "Lengkap" : "Belum Lengkap",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = Object.keys(data[0] ?? {}).map(() => ({ wch: 24 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Monitoring Sidang");
    XLSX.writeFile(wb, `monitoring-plotting-sidang-${Date.now()}.xlsx`);
    toast.success("File Excel berhasil diunduh");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={filterProdi} onValueChange={(v) => { if (v !== null) setFilterProdi(v); }}>
          <SelectTrigger className="w-36 h-8 text-sm">
            <SelectValue placeholder="Semua Prodi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua Prodi</SelectItem>
            <SelectItem value="RPL">RPL</SelectItem>
            <SelectItem value="IF">IF</SelectItem>
            <SelectItem value="DS">DS</SelectItem>
            <SelectItem value="SI">SI</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-gray-500">{filtered.length} data</span>
        <Button type="button" variant="outline" size="sm" className="ml-auto" onClick={exportMonitoring}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export Excel
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-500">
          <ClipboardList className="mx-auto h-8 w-8 text-gray-300 mb-2" />
          Belum ada data sidang yang diimport.
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-gray-600">
                    <th className="text-left px-4 py-3 font-medium">NIM</th>
                    <th className="text-left px-4 py-3 font-medium">Nama</th>
                    <th className="text-left px-4 py-3 font-medium">Prodi</th>
                    <th className="text-left px-4 py-3 font-medium">Pembimbing 1</th>
                    <th className="text-left px-4 py-3 font-medium">Pembimbing 2</th>
                    <th className="text-left px-4 py-3 font-medium">Penguji 1</th>
                    <th className="text-left px-4 py-3 font-medium">Penguji 2</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const lengkap = !!(r.penguji1 && r.penguji2);
                    return (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.nim}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{r.nama}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs">{r.prodi}</Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{r.pembimbing1?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-gray-600">{r.pembimbing2?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-gray-600">{r.penguji1?.name ?? <span className="text-gray-400 italic">Belum</span>}</td>
                        <td className="px-4 py-3 text-gray-600">{r.penguji2?.name ?? <span className="text-gray-400 italic">Belum</span>}</td>
                        <td className="px-4 py-3">
                          <Badge
                            className={
                              lengkap
                                ? "bg-green-100 text-green-800 hover:bg-green-100"
                                : "bg-amber-100 text-amber-800 hover:bg-amber-100"
                            }
                          >
                            {lengkap ? "Lengkap" : "Belum Lengkap"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Belum Penguji Tab ───────────────────────────────────────────────────────

function BelumPengujiTab({
  records,
  dosenList,
}: {
  records: SidangRecordSerialized[];
  dosenList: DosenOption[];
}) {
  const pending = records.filter((r) => !r.penguji1 || !r.penguji2);
  const [loading, setLoading] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<string, { p1: string; p2: string }>>({});

  const getSel = (id: string, field: "p1" | "p2") => selections[id]?.[field] ?? "";
  const setSel = (id: string, field: "p1" | "p2", v: string) =>
    setSelections((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { p1: "", p2: "" }), [field]: v } }));

  const handleAssign = async (record: SidangRecordSerialized) => {
    const p1 = getSel(record.id, "p1") || record.penguji1?.id || "";
    const p2 = getSel(record.id, "p2") || record.penguji2?.id || null;

    if (!p1) { toast.error("Pilih Penguji 1 terlebih dahulu"); return; }

    setLoading(record.id);
    try {
      const res = await assignPengujiSidang(record.id, p1, p2 || null);
      if (!res.success) {
        toast.error(res.error);
      } else {
        if (res.warning) toast.warning(res.warning);
        else toast.success(`Penguji untuk ${record.nama} berhasil ditugaskan`);
      }
    } finally {
      setLoading(null);
    }
  };

  if (pending.length === 0) {
    return (
      <div className="py-12 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-green-500 mb-3" />
        <p className="text-sm font-medium text-gray-700">Semua mahasiswa sudah memiliki penguji lengkap.</p>
      </div>
    );
  }

  const dosenLabel = (d: DosenOption) => `${d.name}${d.kodeDosen ? ` (${d.kodeDosen})` : ""}`;
  const pembimbingIds = (record: SidangRecordSerialized) =>
    new Set([record.pembimbing1?.id, record.pembimbing2?.id].filter(Boolean));

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        {pending.length} mahasiswa belum memiliki penguji lengkap.
      </p>
      {pending.map((record) => {
        const pbb = pembimbingIds(record);
        const sel1 = getSel(record.id, "p1") || record.penguji1?.id || "";
        const sel2 = getSel(record.id, "p2") || record.penguji2?.id || "";
        const warn1 = sel1 && pbb.has(sel1);
        const warn2 = sel2 && pbb.has(sel2);

        return (
          <Card key={record.id}>
            <CardContent className="pt-4 space-y-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">{record.prodi}</Badge>
                  <span className="font-medium text-gray-900">{record.nama}</span>
                  <span className="text-xs font-mono text-gray-500">{record.nim}</span>
                </div>
                {record.judul && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-1">{record.judul}</p>
                )}
                <div className="text-xs text-gray-500 mt-1 space-x-3">
                  <span>PBB 1: {record.pembimbing1?.name ?? "—"}</span>
                  <span>PBB 2: {record.pembimbing2?.name ?? "—"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Select
                    value={sel1}
                    onValueChange={(v) => { if (v) setSel(record.id, "p1", v); }}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Pilih Penguji 1 *" />
                    </SelectTrigger>
                    <SelectContent>
                      {dosenList.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {dosenLabel(d)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {warn1 && (
                    <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Dosen ini juga pembimbing
                    </p>
                  )}
                </div>
                <div>
                  <Select
                    value={sel2 || "none"}
                    onValueChange={(v) => { if (v !== null) setSel(record.id, "p2", v === "none" ? "" : v); }}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Pilih Penguji 2" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">– Tidak ada –</SelectItem>
                      {dosenList.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {dosenLabel(d)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {warn2 && (
                    <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Dosen ini juga pembimbing
                    </p>
                  )}
                </div>
              </div>

              <Button
                size="sm"
                onClick={() => handleAssign(record)}
                disabled={loading === record.id}
                className="bg-[#C8102E] hover:bg-[#a50d26]"
              >
                {loading === record.id ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <UserCheck className="mr-1 h-4 w-4" />
                )}
                {loading === record.id ? "Menyimpan..." : "Tugaskan Penguji"}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

type Tab = "import" | "monitoring" | "belum";

export function PlottingSidangClient({
  records,
  dosenList,
}: {
  records: SidangRecordSerialized[];
  dosenList: DosenOption[];
}) {
  const [tab, setTab] = useState<Tab>("import");

  const tabs: { key: Tab; label: string }[] = [
    { key: "import", label: "Import" },
    { key: "monitoring", label: `Monitoring (${records.length})` },
    { key: "belum", label: `Belum Penguji (${records.filter((r) => !r.penguji1 || !r.penguji2).length})` },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 text-sm font-medium rounded-t border-b-2 transition-colors ${
              tab === t.key
                ? "border-[#C8102E] text-[#C8102E]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "import" && <ImportTab />}
      {tab === "monitoring" && <MonitoringTab records={records} />}
      {tab === "belum" && <BelumPengujiTab records={records} dosenList={dosenList} />}
    </div>
  );
}
