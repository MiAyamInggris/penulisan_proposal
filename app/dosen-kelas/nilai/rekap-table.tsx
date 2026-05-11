"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";

export type RekapRow = {
  id: string;
  nim: string;
  name: string;
  kelas: string;
  prodi: string;
  lrScore: number | null;
  bimbinganScore: number | null;
  deScore: number | null;
  presentasiScore: number | null;
  weightedTotal: number | null;
  gradeIndex: string | null;
  passed: boolean | null;
  isLate: boolean;
};

const columns: ColumnDef<RekapRow>[] = [
  { accessorKey: "kelas", header: "Kelas" },
  { accessorKey: "nim", header: "NIM" },
  { accessorKey: "name", header: "Nama" },
  { accessorKey: "prodi", header: "Prodi" },
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
        <span className="font-bold">
          {row.original.weightedTotal.toFixed(2)}
        </span>
      ) : (
        "–"
      ),
  },
  {
    accessorKey: "gradeIndex",
    header: "Huruf",
    cell: ({ row }) => (
      <span className="font-bold text-lg">
        {row.original.gradeIndex ?? "–"}
      </span>
    ),
  },
  {
    accessorKey: "passed",
    header: "Status",
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
    <DataTable
      columns={columns}
      data={rows}
      searchPlaceholder="Cari mahasiswa..."
    />
  );
}
