"use client";

import { useState } from "react";
import { toast } from "sonner";
import { setGlobalQuotaAdmin } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Save, Crown, Globe } from "lucide-react";

export type QuotaRow = {
  id: string;
  name: string;
  identifier: string;
  isKetua: boolean;
  bimbinganCount: number;
};

export function QuotaEditor({
  dosenList,
  globalQuota,
}: {
  dosenList: QuotaRow[];
  globalQuota: number;
}) {
  const [quota, setQuota] = useState(globalQuota);
  const [saving, setSaving] = useState(false);

  const changed = quota !== globalQuota;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await setGlobalQuotaAdmin(quota);
      if ("error" in res) toast.error(res.error);
      else toast.success("Kuota global berhasil diperbarui");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Global quota setter */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-2 mb-3">
          <Globe className="h-5 w-5 text-blue-600" />
          <h3 className="text-base font-semibold text-gray-900">Kuota Maksimum Semua Dosen</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Nilai ini berlaku untuk seluruh dosen pembimbing. Ketua KK dapat melihat nilai ini di
          halaman kuota.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Kuota Maks per Dosen:</label>
          <Input
            type="number"
            min={0}
            max={100}
            value={quota}
            onChange={(e) => setQuota(Number(e.target.value))}
            className={`w-24 text-center ${changed ? "border-blue-400 ring-1 ring-blue-300" : ""}`}
          />
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !changed}
            variant={changed ? "default" : "outline"}
            className={changed ? "bg-[#C8102E] hover:bg-[#a50d26]" : ""}
          >
            <Save className="h-3.5 w-3.5 mr-1" />
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
          {changed && (
            <span className="text-xs text-blue-600">
              Nilai diubah dari {globalQuota} → {quota}
            </span>
          )}
        </div>
      </div>

      {/* Usage table per dosen */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Dosen</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">NIP</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Bimbingan Aktif</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Sisa Kuota</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {dosenList.map((d) => {
              const sisa = globalQuota - d.bimbinganCount;
              const pct =
                globalQuota > 0 ? Math.round((d.bimbinganCount / globalQuota) * 100) : 100;
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
                        d.bimbinganCount >= globalQuota
                          ? "text-red-600 font-semibold"
                          : "text-gray-700 font-medium"
                      }
                    >
                      {d.bimbinganCount}
                    </span>
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
