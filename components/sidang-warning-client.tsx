"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertTriangle, FileSpreadsheet, Printer, Eye, UserCheck,
  Zap, EyeOff, Loader2, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import type { SidangWarningRow, DosenRef } from "@/app/ketua-kk/plotting-penguji/data-warning/page";
import { resolveWarningChangePenguji, forceInsertWarning, ignoreWarning } from "@/lib/actions/sidang-warning";

type DosenOption = {
  id: string;
  name: string;
  kodeDosen: string | null;
  kelompokKeahlianId: string | null;
  kelompokKeahlianNama: string | null;
};

const WARNING_TYPE_LABELS: Record<string, string> = {
  EXISTING_PENGUJI_DIFFERENT: "Existing Penguji Different",
  CROSS_KK_PENGUJI: "Penguji Lintas KK",
  DUPLICATE_EXAMINER: "Duplicate Examiner",
  HIGH_WORKLOAD: "Beban Dosen Tinggi",
  OVERWRITE_EXISTING: "Overwrite Existing",
  UNRECOGNIZED_DOSEN_CODE: "Kode Dosen Tidak Dikenal",
};

const WARNING_TYPE_COLORS: Record<string, string> = {
  EXISTING_PENGUJI_DIFFERENT: "bg-amber-100 text-amber-800",
  CROSS_KK_PENGUJI: "bg-purple-100 text-purple-800",
  DUPLICATE_EXAMINER: "bg-orange-100 text-orange-800",
  HIGH_WORKLOAD: "bg-red-100 text-red-800",
  OVERWRITE_EXISTING: "bg-amber-100 text-amber-800",
  UNRECOGNIZED_DOSEN_CODE: "bg-gray-100 text-gray-700",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Belum Diselesaikan",
  RESOLVED_CHANGED: "Diselesaikan (Ubah Penguji)",
  RESOLVED_FORCED: "Diselesaikan (Force Insert)",
  IGNORED: "Diabaikan",
};

function dosenLabel(d: DosenRef): string {
  return d ? `${d.name}${d.kodeDosen ? ` (${d.kodeDosen})` : ""}` : "—";
}

function dosenOptionLabel(d: DosenOption): string {
  return `${d.name}${d.kodeDosen ? ` (${d.kodeDosen})` : ""} — ${d.kelompokKeahlianNama ?? "Tanpa KK"}`;
}

// ─── Force Insert confirmation ────────────────────────────────────────────────

function ForceInsertConfirmDialog({ onCancel, onConfirm, loading }: { onCancel: () => void; onConfirm: () => void; loading: boolean }) {
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="h-5 w-5" /> Perhatian
          </DialogTitle>
          <DialogDescription>
            Data yang diimpor akan menggantikan data penguji yang sudah ada.
            <br /><br />
            Apakah Anda yakin ingin melanjutkan?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={loading}>Batal</Button>
          <Button className="bg-[#C8102E] hover:bg-[#a50d26]" onClick={onConfirm} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Force Insert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Detail dialog ────────────────────────────────────────────────────────────

function CompareField({ label, current, imported }: { label: string; current: string; imported: string }) {
  const differs = current !== imported;
  return (
    <tr className="border-t">
      <td className="py-1.5 pr-3 text-gray-500">{label}</td>
      <td className={`py-1.5 pr-3 ${differs ? "text-red-600 font-medium" : "text-gray-700"}`}>{current}</td>
      <td className={`py-1.5 ${differs ? "text-green-700 font-semibold" : "text-gray-700"}`}>{imported}</td>
    </tr>
  );
}

function WarningDetailDialog({
  row,
  dosenList,
  onClose,
}: {
  row: SidangWarningRow;
  dosenList: DosenOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [p1, setP1] = useState(row.importedPenguji1?.id ?? "");
  const [p2, setP2] = useState(row.importedPenguji2?.id ?? "");
  const [loading, setLoading] = useState<"change" | "force" | "ignore" | null>(null);
  const [confirmForce, setConfirmForce] = useState(false);

  const isResolved = row.status !== "PENDING";

  const handleChangePenguji = async () => {
    if (!p1) { toast.error("Pilih Penguji 1 terlebih dahulu"); return; }
    setLoading("change");
    try {
      const res = await resolveWarningChangePenguji(row.id, p1, p2 || null);
      if (!res.success) toast.error(res.error);
      else {
        if (res.warning) toast.warning(res.warning);
        toast.success(`Penguji untuk ${row.nama} berhasil ditugaskan`);
        onClose();
        router.refresh();
      }
    } finally {
      setLoading(null);
    }
  };

  const handleForceInsert = async () => {
    setLoading("force");
    try {
      const res = await forceInsertWarning(row.id);
      if (!res.success) toast.error(res.error);
      else {
        toast.success(`Data ${row.nama} berhasil di-Force Insert`);
        setConfirmForce(false);
        onClose();
        router.refresh();
      }
    } finally {
      setLoading(null);
    }
  };

  const handleIgnore = async () => {
    setLoading("ignore");
    try {
      const res = await ignoreWarning(row.id);
      if (!res.success) toast.error(res.error);
      else {
        toast.success(`Warning untuk ${row.nama} diabaikan`);
        onClose();
        router.refresh();
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{row.nama} ({row.nim})</DialogTitle>
            <DialogDescription>
              {row.prodi} · KK: {row.kelompokKeahlianNama} · {row.judul ?? "Tanpa judul"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={WARNING_TYPE_COLORS[row.warningType] ?? "bg-gray-100 text-gray-700"}>
              {WARNING_TYPE_LABELS[row.warningType] ?? row.warningType}
            </Badge>
            <Badge variant="outline">{STATUS_LABELS[row.status] ?? row.status}</Badge>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 space-y-0.5">
            {row.warningMessages.map((m, i) => <p key={i}>• {m}</p>)}
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Perbandingan Data</h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs">
                  <th className="text-left py-1.5 pr-3 font-medium"> </th>
                  <th className="text-left py-1.5 pr-3 font-medium">Data Sistem Saat Ini</th>
                  <th className="text-left py-1.5 font-medium">Data Diimpor</th>
                </tr>
              </thead>
              <tbody>
                <CompareField label="Pembimbing 1" current={dosenLabel(row.pembimbing1)} imported={dosenLabel(row.pembimbing1)} />
                <CompareField label="Pembimbing 2" current={dosenLabel(row.pembimbing2)} imported={dosenLabel(row.pembimbing2)} />
                <CompareField label="Penguji 1 (PGJ I)" current={dosenLabel(row.existingPenguji1)} imported={dosenLabel(row.importedPenguji1)} />
                <CompareField label="Penguji 2 (PGJ II)" current={dosenLabel(row.existingPenguji2)} imported={dosenLabel(row.importedPenguji2)} />
              </tbody>
            </table>
          </div>

          {!isResolved && (
            <>
              <div className="border-t pt-3">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Ubah Penguji (Resolusi Manual)</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Select value={p1} onValueChange={(v) => { if (v) setP1(v); }}>
                    <SelectTrigger className="text-sm"><SelectValue placeholder="Pilih Penguji 1" /></SelectTrigger>
                    <SelectContent>
                      {dosenList.map((d) => <SelectItem key={d.id} value={d.id}>{dosenOptionLabel(d)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={p2 || "none"} onValueChange={(v) => { if (v) setP2(v === "none" ? "" : v); }}>
                    <SelectTrigger className="text-sm"><SelectValue placeholder="Pilih Penguji 2" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">– Tidak ada –</SelectItem>
                      {dosenList.map((d) => <SelectItem key={d.id} value={d.id}>{dosenOptionLabel(d)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter className="flex-wrap gap-2 sm:justify-between">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleIgnore} disabled={loading !== null}>
                    {loading === "ignore" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <EyeOff className="mr-1 h-4 w-4" />}
                    Ignore
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setConfirmForce(true)} disabled={loading !== null} className="border-amber-300 text-amber-700 hover:bg-amber-50">
                    <Zap className="mr-1 h-4 w-4" />
                    Force Insert
                  </Button>
                </div>
                <Button size="sm" onClick={handleChangePenguji} disabled={loading !== null} className="bg-[#C8102E] hover:bg-[#a50d26]">
                  {loading === "change" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <UserCheck className="mr-1 h-4 w-4" />}
                  Change Penguji
                </Button>
              </DialogFooter>
            </>
          )}

          {isResolved && (
            <div className="flex items-center gap-2 text-sm text-green-700 border-t pt-3">
              <CheckCircle2 className="h-4 w-4" />
              Sudah diselesaikan{row.resolvedAt ? ` pada ${new Date(row.resolvedAt).toLocaleString("id-ID")}` : ""}.
            </div>
          )}
        </DialogContent>
      </Dialog>

      {confirmForce && (
        <ForceInsertConfirmDialog
          loading={loading === "force"}
          onCancel={() => setConfirmForce(false)}
          onConfirm={handleForceInsert}
        />
      )}
    </>
  );
}

// ─── Main client ──────────────────────────────────────────────────────────────

export function SidangWarningClient({
  rows,
  dosenList,
  kkFilterOptions,
}: {
  rows: SidangWarningRow[];
  dosenList: DosenOption[];
  kkFilterOptions?: { id: string; nama: string }[];
}) {
  const [statusTab, setStatusTab] = useState<"PENDING" | "HISTORY">("PENDING");
  const [detailRow, setDetailRow] = useState<SidangWarningRow | null>(null);
  const [filterKK, setFilterKK] = useState("ALL");

  const isAdminView = !!kkFilterOptions;
  const kkFiltered = filterKK === "ALL" ? rows : rows.filter((r) => r.kelompokKeahlianId === filterKK);
  const pending = kkFiltered.filter((r) => r.status === "PENDING");
  const history = kkFiltered.filter((r) => r.status !== "PENDING");
  const visible = statusTab === "PENDING" ? pending : history;

  const exportExcel = () => {
    const data = visible.map((r) => ({
      NIM: r.nim,
      Nama: r.nama,
      Prodi: r.prodi,
      "Kelompok Keahlian": r.kelompokKeahlianNama,
      "Pembimbing 1": dosenLabel(r.pembimbing1),
      "Pembimbing 2": dosenLabel(r.pembimbing2),
      "Penguji Existing 1": dosenLabel(r.existingPenguji1),
      "Penguji Existing 2": dosenLabel(r.existingPenguji2),
      "Penguji Imported 1": dosenLabel(r.importedPenguji1),
      "Penguji Imported 2": dosenLabel(r.importedPenguji2),
      "Warning Type": WARNING_TYPE_LABELS[r.warningType] ?? r.warningType,
      Keterangan: r.warningMessages.join("; "),
      Status: STATUS_LABELS[r.status] ?? r.status,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = Object.keys(data[0] ?? {}).map(() => ({ wch: 24 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Warning");
    XLSX.writeFile(wb, `data-warning-plotting-penguji-${Date.now()}.xlsx`);
    toast.success("File Excel berhasil diunduh");
  };

  const printPdf = () => {
    const win = window.open("", "_blank");
    if (!win) { toast.error("Popup diblokir browser — izinkan popup untuk mencetak"); return; }
    const rowsHtml = visible.map((r) => `
      <tr>
        <td>${r.nim}</td><td>${r.nama}</td><td>${r.prodi}</td><td>${r.kelompokKeahlianNama}</td>
        <td>${dosenLabel(r.pembimbing1)}</td><td>${dosenLabel(r.pembimbing2)}</td>
        <td>${dosenLabel(r.existingPenguji1)} / ${dosenLabel(r.existingPenguji2)}</td>
        <td>${dosenLabel(r.importedPenguji1)} / ${dosenLabel(r.importedPenguji2)}</td>
        <td>${WARNING_TYPE_LABELS[r.warningType] ?? r.warningType}</td>
      </tr>`).join("");
    win.document.write(`
      <html><head><title>Data Warning & Confirmation</title>
      <style>
        body { font-family: sans-serif; font-size: 12px; padding: 24px; }
        h1 { font-size: 16px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; }
        th { background: #f3f4f6; }
      </style>
      </head><body>
      <h1>Data Warning & Confirmation — ${new Date().toLocaleDateString("id-ID")}</h1>
      <table>
        <thead><tr>
          <th>NIM</th><th>Nama</th><th>Prodi</th><th>KK</th>
          <th>Pembimbing 1</th><th>Pembimbing 2</th>
          <th>Penguji Existing</th><th>Penguji Imported</th><th>Warning Type</th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      </body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 border-b">
          {([
            { key: "PENDING" as const, label: `Belum Diselesaikan (${pending.length})` },
            { key: "HISTORY" as const, label: `Riwayat (${history.length})` },
          ]).map((t) => (
            <button key={t.key} onClick={() => setStatusTab(t.key)}
              className={`px-4 py-1.5 text-sm font-medium rounded-t border-b-2 transition-colors ${
                statusTab === t.key ? "border-[#C8102E] text-[#C8102E]" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          {kkFilterOptions && (
            <Select value={filterKK} onValueChange={(v) => { if (v) setFilterKK(v); }}>
              <SelectTrigger className="w-52 h-8 text-sm"><SelectValue placeholder="Kelompok Keahlian" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua KK</SelectItem>
                {kkFilterOptions.map((kk) => <SelectItem key={kk.id} value={kk.id}>{kk.nama}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Button type="button" variant="outline" size="sm" onClick={exportExcel}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />Export Excel
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={printPdf}>
            <Printer className="mr-2 h-4 w-4" />Cetak PDF
          </Button>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-500">
          <CheckCircle2 className="mx-auto h-8 w-8 text-green-400 mb-2" />
          {statusTab === "PENDING" ? "Tidak ada data warning yang perlu diselesaikan." : "Belum ada riwayat penyelesaian warning."}
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
                    {isAdminView && <th className="text-left px-4 py-3 font-medium">KK</th>}
                    <th className="text-left px-4 py-3 font-medium">Pembimbing 1</th>
                    <th className="text-left px-4 py-3 font-medium">Pembimbing 2</th>
                    <th className="text-left px-4 py-3 font-medium">Penguji Existing</th>
                    <th className="text-left px-4 py-3 font-medium">Penguji Imported</th>
                    <th className="text-left px-4 py-3 font-medium">Warning Type</th>
                    <th className="text-left px-4 py-3 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.nim}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{r.nama}</td>
                      <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{r.prodi}</Badge></td>
                      {isAdminView && <td className="px-4 py-3 text-gray-600 text-sm">{r.kelompokKeahlianNama}</td>}
                      <td className="px-4 py-3 text-gray-600 text-sm">{dosenLabel(r.pembimbing1)}</td>
                      <td className="px-4 py-3 text-gray-600 text-sm">{dosenLabel(r.pembimbing2)}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        <div>{dosenLabel(r.existingPenguji1)}</div>
                        <div>{dosenLabel(r.existingPenguji2)}</div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="text-green-700 font-medium">{dosenLabel(r.importedPenguji1)}</div>
                        <div className="text-green-700 font-medium">{dosenLabel(r.importedPenguji2)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={WARNING_TYPE_COLORS[r.warningType] ?? "bg-gray-100 text-gray-700"}>
                          {WARNING_TYPE_LABELS[r.warningType] ?? r.warningType}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" onClick={() => setDetailRow(r)}>
                          <Eye className="mr-1 h-3.5 w-3.5" />Detail
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {detailRow && (
        <WarningDetailDialog row={detailRow} dosenList={dosenList} onClose={() => setDetailRow(null)} />
      )}
    </div>
  );
}
