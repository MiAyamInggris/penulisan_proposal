"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import type { BebanDosenRow } from "@/app/ketua-kk/plotting-penguji/beban-dosen/page";

type SortKey = "totalBeban" | "jumlahPenguji" | "jumlahPembimbing" | "name";
type SortDir = "asc" | "desc";

const LOAD_THRESHOLDS = { rendah: 5, normal: 10 };

function getLoadStatus(total: number): "rendah" | "normal" | "tinggi" {
  if (total <= LOAD_THRESHOLDS.rendah) return "rendah";
  if (total <= LOAD_THRESHOLDS.normal) return "normal";
  return "tinggi";
}

const LOAD_CONFIG = {
  rendah: { label: "Rendah", color: "bg-green-100 text-green-700 hover:bg-green-100" },
  normal: { label: "Normal", color: "bg-blue-100 text-blue-700 hover:bg-blue-100" },
  tinggi: { label: "Tinggi", color: "bg-red-100 text-red-700 hover:bg-red-100" },
};

function SortButton({
  field,
  label,
  currentKey,
  currentDir,
  onSort,
}: {
  field: SortKey;
  label: string;
  currentKey: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const active = currentKey === field;
  return (
    <button
      onClick={() => onSort(field)}
      className={`flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors ${
        active
          ? "border-[#C8102E] bg-red-50 text-[#C8102E]"
          : "border-gray-200 text-gray-600 hover:border-gray-300"
      }`}
    >
      {label}
      <ArrowUpDown className="h-3 w-3" />
      {active && <span className="text-[10px]">{currentDir === "desc" ? "↓" : "↑"}</span>}
    </button>
  );
}

export function BebanDosenSidangClient({ rows }: { rows: BebanDosenRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("totalBeban");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = [...rows].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "name") {
      cmp = a.name.localeCompare(b.name);
    } else {
      cmp = a[sortKey] - b[sortKey];
    }
    return sortDir === "desc" ? -cmp : cmp;
  });

  const exportExcel = () => {
    const data = sorted.map((r) => ({
      "Kode Dosen": r.kodeDosen ?? "—",
      "Nama Dosen": r.name,
      "Kelompok Keahlian": r.kelompokKeahlian ?? "—",
      "Jumlah Pembimbing": r.jumlahPembimbing,
      "Jumlah Penguji": r.jumlahPenguji,
      "Total Beban Sidang": r.totalBeban,
      Indikator: LOAD_CONFIG[getLoadStatus(r.totalBeban)].label,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [{ wch: 14 }, { wch: 30 }, { wch: 26 }, { wch: 20 }, { wch: 16 }, { wch: 20 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Beban Dosen Penguji");
    XLSX.writeFile(wb, `beban-dosen-penguji-${Date.now()}.xlsx`);
    toast.success("File Excel berhasil diunduh");
  };

  // Summary stats
  const totalRows = rows.length;
  const rendahCount = rows.filter((r) => getLoadStatus(r.totalBeban) === "rendah").length;
  const normalCount = rows.filter((r) => getLoadStatus(r.totalBeban) === "normal").length;
  const tinggiCount = rows.filter((r) => getLoadStatus(r.totalBeban) === "tinggi").length;
  const totalPembimbing = rows.reduce((a, r) => a + r.jumlahPembimbing, 0);
  const totalPenguji = rows.reduce((a, r) => a + r.jumlahPenguji, 0);

  if (rows.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">Belum ada data.</p>;
  }

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-lg bg-gray-50 border p-3 text-center">
          <p className="text-2xl font-bold text-gray-900">{totalRows}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Dosen</p>
        </div>
        <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-3 text-center">
          <p className="text-2xl font-bold text-indigo-700">{totalPembimbing}</p>
          <p className="text-xs text-indigo-600 mt-0.5">Total Pembimbing</p>
        </div>
        <div className="rounded-lg bg-rose-50 border border-rose-100 p-3 text-center">
          <p className="text-2xl font-bold text-rose-700">{totalPenguji}</p>
          <p className="text-xs text-rose-600 mt-0.5">Total Penguji</p>
        </div>
        <div className="rounded-lg bg-green-50 border border-green-100 p-3 text-center">
          <p className="text-2xl font-bold text-green-700">{rendahCount}</p>
          <p className="text-xs text-green-600 mt-0.5">Rendah (≤{LOAD_THRESHOLDS.rendah})</p>
        </div>
        <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-center">
          <p className="text-2xl font-bold text-red-700">{tinggiCount}</p>
          <p className="text-xs text-red-600 mt-0.5">Tinggi (&gt;{LOAD_THRESHOLDS.normal})</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-500 mr-1">Urutkan:</span>
        <SortButton field="totalBeban" label="Total Beban" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
        <SortButton field="jumlahPenguji" label="Penguji Terbanyak" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
        <SortButton field="jumlahPembimbing" label="Pembimbing Terbanyak" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
        <SortButton field="name" label="Nama" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
        <Button type="button" variant="outline" size="sm" className="ml-auto" onClick={exportExcel}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export Excel
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-gray-600">
                  <th className="text-left px-4 py-3 font-medium">Kode</th>
                  <th className="text-left px-4 py-3 font-medium">Nama Dosen</th>
                  <th className="text-left px-4 py-3 font-medium">Kelompok Keahlian</th>
                  <th className="text-center px-4 py-3 font-medium">
                    Pembimbing
                    <span className="block text-[10px] font-normal text-gray-400">(PBB I + II)</span>
                  </th>
                  <th className="text-center px-4 py-3 font-medium">
                    Penguji
                    <span className="block text-[10px] font-normal text-gray-400">(PGJ I + II)</span>
                  </th>
                  <th className="text-center px-4 py-3 font-medium">Total Beban Sidang</th>
                  <th className="text-center px-4 py-3 font-medium">Indikator</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((d) => {
                  const status = getLoadStatus(d.totalBeban);
                  const cfg = LOAD_CONFIG[status];
                  const barPct = Math.min((d.totalBeban / (LOAD_THRESHOLDS.normal * 1.5)) * 100, 100);

                  return (
                    <tr key={d.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        {d.kodeDosen ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{d.name}</td>
                      <td className="px-4 py-3 text-gray-600 text-sm">{d.kelompokKeahlian ?? "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-semibold text-indigo-700">{d.jumlahPembimbing}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-semibold text-rose-700">{d.jumlahPenguji}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-lg font-bold ${status === "tinggi" ? "text-red-600" : status === "normal" ? "text-blue-700" : "text-green-700"}`}>
                            {d.totalBeban}
                          </span>
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${status === "tinggi" ? "bg-red-500" : status === "normal" ? "bg-blue-400" : "bg-green-400"}`}
                              style={{ width: `${barPct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={cfg.color}>{cfg.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="px-4 py-3 border-t bg-gray-50 flex flex-wrap gap-4 text-xs text-gray-500">
            <span className="font-medium text-gray-600">Indikator beban sidang:</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
              Rendah (0–{LOAD_THRESHOLDS.rendah})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
              Normal ({LOAD_THRESHOLDS.rendah + 1}–{LOAD_THRESHOLDS.normal})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              Tinggi (&gt;{LOAD_THRESHOLDS.normal})
            </span>
            <span className="text-gray-400 ml-auto">Formula: Total Beban = Pembimbing + Penguji</span>
          </div>
        </CardContent>
      </Card>

      {/* Insight */}
      {tinggiCount > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>{tinggiCount} dosen</strong> memiliki beban sidang <strong>Tinggi</strong>.
          Pertimbangkan untuk mendistribusikan penugasan penguji ke dosen dengan beban lebih rendah.
        </div>
      )}

      {normalCount === totalRows && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Distribusi beban sidang sudah merata. Semua dosen berada dalam kategori Normal atau Rendah.
        </div>
      )}
    </div>
  );
}
