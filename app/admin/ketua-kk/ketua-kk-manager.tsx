"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { toggleKetua } from "@/app/admin/users/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Crown, Search, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

type DosenRow = {
  id: string;
  name: string;
  identifier: string;
  isKetua: boolean;
  maxBimbinganQuota: number;
  bimbinganCount: number;
  activeBimbingan: number;
};

type SortField = "name" | "bimbinganCount" | "activeBimbingan" | "isKetua";
type SortDir = "asc" | "desc";

function SortIcon({ field, active, dir }: { field: string; active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="h-3.5 w-3.5 text-gray-400" />;
  return dir === "asc"
    ? <ChevronUp className="h-3.5 w-3.5 text-gray-700" />
    : <ChevronDown className="h-3.5 w-3.5 text-gray-700" />;
}

export function KetuaKKManager({
  rows,
  totalEnrolled,
}: {
  rows: DosenRow[];
  totalEnrolled: number;
}) {
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterKK, setFilterKK] = useState<"all" | "ketua" | "dosen">("all");
  const [sortField, setSortField] = useState<SortField>("isKetua");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleToggle = async (row: DosenRow) => {
    setSaving(row.id);
    try {
      const res = await toggleKetua(row.id, !row.isKetua);
      if ("error" in res) toast.error(res.error);
      else toast.success(row.isKetua ? "Status Ketua KK dicabut" : `${row.name} dijadikan Ketua KK`);
    } finally {
      setSaving(null);
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) setDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir(field === "isKetua" ? "desc" : "asc"); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const setDir = (d: SortDir) => setSortDir(d);

  const filtered = useMemo(() => {
    let data = [...rows];
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter((r) => r.name.toLowerCase().includes(q) || r.identifier.includes(q));
    }
    if (filterKK === "ketua") data = data.filter((r) => r.isKetua);
    if (filterKK === "dosen") data = data.filter((r) => !r.isKetua);
    data.sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") cmp = a.name.localeCompare(b.name);
      else if (sortField === "bimbinganCount") cmp = a.bimbinganCount - b.bimbinganCount;
      else if (sortField === "activeBimbingan") cmp = a.activeBimbingan - b.activeBimbingan;
      else if (sortField === "isKetua") cmp = Number(b.isKetua) - Number(a.isKetua);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return data;
  }, [rows, search, filterKK, sortField, sortDir]);

  const ketuaRows = rows.filter((r) => r.isKetua);
  const totalBimbinganByKK = ketuaRows.reduce((s, r) => s + r.bimbinganCount, 0);

  const Th = ({ label, field }: { label: string; field: SortField }) => (
    <th
      className="text-left px-4 py-3 font-medium text-gray-600 text-sm cursor-pointer select-none hover:bg-gray-100 transition-colors"
      onClick={() => toggleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <SortIcon field={field} active={sortField === field} dir={sortDir} />
      </div>
    </th>
  );

  return (
    <div className="space-y-6">
      {/* KK Summary section */}
      {ketuaRows.length > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="h-4 w-4 text-yellow-600" />
            <h2 className="text-sm font-semibold text-yellow-900">
              Ringkasan Ketua KK ({ketuaRows.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-yellow-200">
                  <th className="text-left py-2 pr-4 font-medium text-yellow-800">Nama Ketua KK</th>
                  <th className="text-center py-2 px-4 font-medium text-yellow-800">Bimbingan Aktif</th>
                  <th className="text-center py-2 px-4 font-medium text-yellow-800">Total Bimbingan</th>
                  <th className="text-center py-2 px-4 font-medium text-yellow-800">Kuota Maks</th>
                  <th className="text-center py-2 px-4 font-medium text-yellow-800">Penggunaan Kuota</th>
                  <th className="text-center py-2 px-4 font-medium text-yellow-800">Status</th>
                </tr>
              </thead>
              <tbody>
                {ketuaRows.map((kk) => {
                  const pct = Math.round((kk.bimbinganCount / (kk.maxBimbinganQuota || 1)) * 100);
                  return (
                    <tr key={kk.id} className="border-b border-yellow-100 last:border-0">
                      <td className="py-2 pr-4 font-medium text-yellow-900">
                        <div className="flex items-center gap-1.5">
                          <Crown className="h-3.5 w-3.5 text-yellow-600 shrink-0" />
                          {kk.name}
                        </div>
                        <p className="text-xs text-yellow-700 ml-5">{kk.identifier}</p>
                      </td>
                      <td className="py-2 px-4 text-center font-medium text-yellow-900">{kk.activeBimbingan}</td>
                      <td className="py-2 px-4 text-center text-yellow-800">{kk.bimbinganCount}</td>
                      <td className="py-2 px-4 text-center text-yellow-800">{kk.maxBimbinganQuota}</td>
                      <td className="py-2 px-4">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-20 bg-yellow-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${pct >= 100 ? "bg-red-500" : pct >= 70 ? "bg-yellow-500" : "bg-green-500"}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-yellow-700 w-8">{pct}%</span>
                        </div>
                      </td>
                      <td className="py-2 px-4 text-center">
                        <Badge
                          className={
                            pct >= 100
                              ? "bg-red-100 text-red-700 hover:bg-red-100"
                              : pct >= 70
                              ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                              : "bg-green-100 text-green-700 hover:bg-green-100"
                          }
                        >
                          {pct >= 100 ? "Penuh" : pct >= 70 ? "Hampir Penuh" : "Tersedia"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-yellow-300 bg-yellow-100">
                  <td className="py-2 pr-4 text-xs font-semibold text-yellow-800">
                    Total (semua KK)
                  </td>
                  <td className="py-2 px-4 text-center text-xs font-semibold text-yellow-800">
                    {ketuaRows.reduce((s, r) => s + r.activeBimbingan, 0)}
                  </td>
                  <td className="py-2 px-4 text-center text-xs font-semibold text-yellow-800">
                    {totalBimbinganByKK}
                  </td>
                  <td colSpan={3} className="py-2 px-4 text-right text-xs text-yellow-700">
                    {totalEnrolled} mahasiswa terdaftar total
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Dosen assignment table */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Cari nama atau NIP dosen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "ketua", "dosen"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilterKK(f)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  filterKK === f
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {f === "all" ? `Semua (${rows.length})` : f === "ketua" ? `Ketua KK (${rows.filter((r) => r.isKetua).length})` : `Dosen (${rows.filter((r) => !r.isKetua).length})`}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <Th label="Nama Dosen" field="name" />
                <th className="text-left px-4 py-3 font-medium text-gray-600 text-sm">NIP</th>
                <Th label="Status" field="isKetua" />
                <Th label="Bimbingan Aktif" field="activeBimbingan" />
                <Th label="Total Bimbingan" field="bimbinganCount" />
                <th className="text-center px-4 py-3 font-medium text-gray-600 text-sm">Kuota</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600 text-sm">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">
                    Tidak ada dosen ditemukan
                  </td>
                </tr>
              )}
              {filtered.map((row) => {
                const pct = Math.round((row.bimbinganCount / (row.maxBimbinganQuota || 1)) * 100);
                return (
                  <tr key={row.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {row.isKetua && <Crown className="h-3.5 w-3.5 text-yellow-500 shrink-0" />}
                        <span className="font-medium text-gray-900">{row.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{row.identifier}</td>
                    <td className="px-4 py-3">
                      {row.isKetua ? (
                        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                          Ketua KK
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Dosen</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-gray-700">
                      {row.activeBimbingan}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{row.bimbinganCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-16 bg-gray-200 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${pct >= 100 ? "bg-red-500" : pct >= 70 ? "bg-yellow-500" : "bg-green-500"}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-14 shrink-0">
                          {row.bimbinganCount}/{row.maxBimbinganQuota}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        size="sm"
                        variant={row.isKetua ? "outline" : "default"}
                        onClick={() => handleToggle(row)}
                        disabled={saving === row.id}
                        className={
                          row.isKetua
                            ? "border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                            : "bg-yellow-500 hover:bg-yellow-600 text-white"
                        }
                      >
                        <Crown className="h-3.5 w-3.5 mr-1.5" />
                        {saving === row.id
                          ? "Menyimpan..."
                          : row.isKetua
                          ? "Cabut KK"
                          : "Jadikan KK"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 text-right">{filtered.length} dari {rows.length} dosen ditampilkan</p>
      </div>
    </div>
  );
}
