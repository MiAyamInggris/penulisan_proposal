"use client";

import { Badge } from "@/components/ui/badge";
import { Crown, Lock } from "lucide-react";

type DosenRow = {
  id: string;
  name: string;
  identifier: string;
  isKetua: boolean;
  maxBimbinganQuota: number;
  bimbinganCount: number;
};

export function QuotaTable({ dosenList }: { dosenList: DosenRow[] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <Lock className="h-4 w-4 shrink-0 text-amber-600" />
        <span>
          Kuota hanya dapat diubah oleh <strong>Admin</strong>.
          Hubungi Admin jika perlu penyesuaian kuota dosen.
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Dosen</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">NIP</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Bimbingan Aktif</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Kuota Maks</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Sisa Kuota</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {dosenList.map((d) => {
              const sisa = d.maxBimbinganQuota - d.bimbinganCount;
              const pct =
                d.maxBimbinganQuota > 0
                  ? Math.round((d.bimbinganCount / d.maxBimbinganQuota) * 100)
                  : 100;
              return (
                <tr key={d.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {d.isKetua && <Crown className="h-3.5 w-3.5 text-yellow-500 shrink-0" />}
                      <span className="font-medium text-gray-900">{d.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{d.identifier}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={
                        d.bimbinganCount >= d.maxBimbinganQuota
                          ? "text-red-600 font-semibold"
                          : "text-gray-700 font-medium"
                      }
                    >
                      {d.bimbinganCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600 font-medium">
                    {d.maxBimbinganQuota}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={
                        sisa <= 0
                          ? "text-red-600 font-semibold"
                          : sisa <= 2
                          ? "text-yellow-600 font-medium"
                          : "text-green-700 font-medium"
                      }
                    >
                      {Math.max(0, sisa)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-16 bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            pct >= 100
                              ? "bg-red-500"
                              : pct >= 70
                              ? "bg-yellow-500"
                              : "bg-green-500"
                          }`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
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
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
