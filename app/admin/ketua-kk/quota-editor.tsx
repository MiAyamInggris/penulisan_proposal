"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updateQuotaAdmin } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Save, Crown } from "lucide-react";

export type QuotaRow = {
  id: string;
  name: string;
  identifier: string;
  isKetua: boolean;
  maxBimbinganQuota: number;
  bimbinganCount: number;
};

export function QuotaEditor({ dosenList }: { dosenList: QuotaRow[] }) {
  const [quotas, setQuotas] = useState<Record<string, number>>(
    Object.fromEntries(dosenList.map((d) => [d.id, d.maxBimbinganQuota]))
  );
  const [saving, setSaving] = useState<string | null>(null);

  const handleSave = async (id: string) => {
    setSaving(id);
    try {
      const res = await updateQuotaAdmin(id, quotas[id]);
      if ("error" in res) toast.error(res.error);
      else toast.success("Kuota berhasil diperbarui");
    } finally {
      setSaving(null);
    }
  };

  const changed = (id: string) =>
    quotas[id] !== dosenList.find((d) => d.id === id)?.maxBimbinganQuota;

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="text-left px-4 py-3 font-medium text-gray-600">Dosen</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">NIP</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600">Bimbingan Aktif</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600">Sisa Kuota</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600">Kuota Maks</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {dosenList.map((d) => {
            const sisa = d.maxBimbinganQuota - d.bimbinganCount;
            const pct = d.maxBimbinganQuota > 0
              ? Math.round((d.bimbinganCount / d.maxBimbinganQuota) * 100)
              : 100;
            const isChanged = changed(d.id);
            return (
              <tr key={d.id} className={`border-b last:border-0 transition-colors ${isChanged ? "bg-blue-50/40" : "hover:bg-gray-50"}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {d.isKetua && <Crown className="h-3.5 w-3.5 text-yellow-500 shrink-0" />}
                    <span className="font-medium text-gray-900">{d.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">{d.identifier}</td>
                <td className="px-4 py-3 text-center">
                  <span className={d.bimbinganCount >= d.maxBimbinganQuota ? "text-red-600 font-medium" : "text-gray-700"}>
                    {d.bimbinganCount}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={sisa <= 0 ? "text-red-600 font-semibold" : sisa <= 2 ? "text-yellow-600 font-medium" : "text-green-700 font-medium"}>
                    {Math.max(0, sisa)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-center">
                    <Input
                      type="number"
                      min={0}
                      max={50}
                      value={quotas[d.id]}
                      onChange={(e) =>
                        setQuotas((prev) => ({ ...prev, [d.id]: Number(e.target.value) }))
                      }
                      className={`w-20 h-8 text-center ${isChanged ? "border-blue-400 ring-1 ring-blue-300" : ""}`}
                    />
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
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
                <td className="px-4 py-3 text-center">
                  <Button
                    size="sm"
                    variant={isChanged ? "default" : "outline"}
                    onClick={() => handleSave(d.id)}
                    disabled={saving === d.id || !isChanged}
                    className={isChanged ? "bg-[#C8102E] hover:bg-[#a50d26]" : ""}
                  >
                    <Save className="h-3.5 w-3.5 mr-1" />
                    {saving === d.id ? "Menyimpan..." : "Simpan"}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
