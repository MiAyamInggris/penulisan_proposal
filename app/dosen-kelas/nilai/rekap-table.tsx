"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";

export type RekapRow = {
  id: string;
  nim: string;
  name: string;
  kelas: string;
  prodi: string;
  status: string;
  lrScore: number | null;
  bimbinganScore: number | null;
  deScore: number | null;
  presentasiScore: number | null;
  weightedTotal: number | null;
  gradeIndex: string | null;
  passed: boolean | null;
  isLate: boolean;
};

function exportToExcel(rows: RekapRow[]) {
  const data = rows.map((r) => ({
    Kelas: r.kelas,
    NIM: r.nim,
    Nama: r.name,
    Prodi: r.prodi,
    Status: r.status,
    "Nilai LR": r.lrScore !== null ? r.lrScore.toFixed(1) : "–",
    "Nilai Bimbingan": r.bimbinganScore !== null ? r.bimbinganScore.toFixed(1) : "–",
    "Nilai DE": r.deScore !== null ? r.deScore.toFixed(1) : "–",
    "Terlambat DE": r.isLate ? "Ya" : "Tidak",
    "Nilai Presentasi": r.presentasiScore !== null ? r.presentasiScore.toFixed(1) : "–",
    "Nilai Akhir": r.weightedTotal !== null ? r.weightedTotal.toFixed(2) : "–",
    "Huruf": r.gradeIndex ?? "–",
    "Status Kelulusan": r.passed === null ? "–" : r.passed ? "LULUS" : "TIDAK LULUS",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  // Auto-fit column widths
  const colWidths = Object.keys(data[0] ?? {}).map((key) => ({
    wch: Math.max(key.length, ...data.map((r) => String((r as Record<string, string>)[key] ?? "").length)) + 2,
  }));
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rekap Nilai");

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `rekap-nilai-${date}.xlsx`);
}

const STATUS_LABELS: Record<string, string> = {
  ENROLLED: "Terdaftar",
  PROPOSAL_UPLOADED: "Proposal Terdaftar",
  ASSIGNED: "Pembimbing Ditugaskan",
  BIMBINGAN: "Bimbingan",
  DE_READY: "Siap DE",
  DE_COMPLETED: "DE Selesai",
  REVISION_UPLOADED: "Revisi Diunggah",
  SEMINAR_REGISTERED: "Daftar Seminar",
  SEMINAR_COMPLETED: "Seminar Selesai",
  COMPLETED: "Selesai",
};

const columns: ColumnDef<RekapRow>[] = [
  { accessorKey: "kelas", header: "Kelas" },
  { accessorKey: "nim", header: "NIM" },
  { accessorKey: "name", header: "Nama" },
  { accessorKey: "prodi", header: "Prodi" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <span className="text-xs text-gray-500">
        {STATUS_LABELS[row.original.status] ?? row.original.status}
      </span>
    ),
  },
  {
    accessorKey: "lrScore",
    header: "LR",
    cell: ({ row }) => row.original.lrScore?.toFixed(1) ?? "–",
  },
  {
    accessorKey: "bimbinganScore",
    header: "Bimbingan",
    cell: ({ row }) => row.original.bimbinganScore?.toFixed(1) ?? "–",
  },
  {
    accessorKey: "deScore",
    header: "DE",
    cell: ({ row }) => (
      <span>
        {row.original.deScore?.toFixed(1) ?? "–"}
        {row.original.isLate && (
          <span className="text-xs text-red-400 ml-1">(L)</span>
        )}
      </span>
    ),
  },
  {
    accessorKey: "presentasiScore",
    header: "Presentasi",
    cell: ({ row }) => row.original.presentasiScore?.toFixed(1) ?? "–",
  },
  {
    accessorKey: "weightedTotal",
    header: "Nilai Akhir",
    cell: ({ row }) =>
      row.original.weightedTotal !== null ? (
        <span className="font-bold">{row.original.weightedTotal.toFixed(2)}</span>
      ) : (
        "–"
      ),
  },
  {
    accessorKey: "gradeIndex",
    header: "Huruf",
    cell: ({ row }) => (
      <span className="font-bold text-lg">{row.original.gradeIndex ?? "–"}</span>
    ),
  },
  {
    accessorKey: "passed",
    header: "Kelulusan",
    cell: ({ row }) =>
      row.original.passed === null ? (
        <span className="text-gray-400 text-xs">–</span>
      ) : row.original.passed ? (
        <span className="text-green-600 font-semibold text-xs">LULUS</span>
      ) : (
        <span className="text-red-600 font-semibold text-xs">TIDAK LULUS</span>
      ),
  },
];

export function RekapTable({ rows }: { rows: RekapRow[] }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={() => exportToExcel(rows)}
          disabled={rows.length === 0}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Export Excel
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={rows}
        searchPlaceholder="Cari mahasiswa..."
      />
    </div>
  );
}
