"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";

export type KelasRow = {
  id: string;
  name: string;
  nim: string;
  status: string;
  bimbinganCount: number;
  eprtStatus: string | null;
  deStatus: string;
  seminarStatus: string | null;
  nilaiAkhir: number | null;
  grade: string | null;
};

const columns: ColumnDef<KelasRow>[] = [
  { accessorKey: "nim", header: "NIM" },
  { accessorKey: "name", header: "Nama" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge status={row.original.status} type="proposal" />
    ),
  },
  {
    accessorKey: "bimbinganCount",
    header: "Bimbingan",
    cell: ({ row }) => (
      <span
        className={
          row.original.bimbinganCount >= 3
            ? "text-green-600 font-semibold"
            : "text-red-500"
        }
      >
        {row.original.bimbinganCount}/3
      </span>
    ),
  },
  {
    accessorKey: "eprtStatus",
    header: "EpRT",
    cell: ({ row }) =>
      row.original.eprtStatus ? (
        <StatusBadge status={row.original.eprtStatus} type="eprt" />
      ) : (
        <span className="text-gray-400 text-xs">Belum upload</span>
      ),
  },
  { accessorKey: "deStatus", header: "DE" },
  {
    accessorKey: "nilaiAkhir",
    header: "Nilai Akhir",
    cell: ({ row }) =>
      row.original.nilaiAkhir !== null ? (
        <span className="font-semibold">
          {row.original.nilaiAkhir.toFixed(1)} ({row.original.grade})
        </span>
      ) : (
        <span className="text-gray-400">–</span>
      ),
  },
];

interface KelasTableProps {
  data: KelasRow[];
}

export function KelasTable({ data }: KelasTableProps) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="Cari mahasiswa..."
    />
  );
}
