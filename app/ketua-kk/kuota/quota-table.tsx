"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updateQuota } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save } from "lucide-react";

type DosenRow = {
  id: string;
  name: string;
  identifier: string;
  isKetua: boolean;
  maxBimbinganQuota: number;
  bimbinganCount: number;
};

export function QuotaTable({ dosenList }: { dosenList: DosenRow[] }) {
  const [quotas, setQuotas] = useState<Record<string, number>>(
    Object.fromEntries(dosenList.map((d) => [d.id, d.maxBimbinganQuota]))
  );
  const [saving, setSaving] = useState<string | null>(null);

  const handleSave = async (id: string) => {
    setSaving(id);
    try {
      const res = await updateQuota(id, quotas[id]);
      if ("error" in res) toast.error(res.error);
      else toast.success("Kuota berhasil diperbarui");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="text-left px-4 py-3 font-medium text-gray-600">Dosen</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">NIP</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600">Bimbingan Saat Ini</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600">Kuota Maks</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {dosenList.map((d) => (
            <tr key={d.id} className="border-b last:border-0 hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">
                {d.name}
                {d.isKetua && (
                  <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">
                    Ketua KK
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-gray-500">{d.identifier}</td>
              <td className="px-4 py-3 text-center">
                <span
                  className={
                    d.bimbinganCount >= d.maxBimbinganQuota
                      ? "text-red-600 font-medium"
                      : "text-gray-700"
                  }
                >
                  {d.bimbinganCount}
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
                    className="w-20 h-8 text-center"
                  />
                </div>
              </td>
              <td className="px-4 py-3 text-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSave(d.id)}
                  disabled={saving === d.id}
                >
                  <Save className="h-3.5 w-3.5 mr-1" />
                  {saving === d.id ? "Menyimpan..." : "Simpan"}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
