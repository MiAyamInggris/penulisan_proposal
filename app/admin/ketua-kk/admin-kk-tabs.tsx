"use client";

import { useState } from "react";
import { KetuaKKManager } from "./ketua-kk-manager";
import { QuotaEditor, type QuotaRow } from "./quota-editor";

type KKRow = {
  id: string;
  name: string;
  identifier: string;
  isKetua: boolean;
  maxBimbinganQuota: number;
  bimbinganCount: number;
  activeBimbingan: number;
};

export function AdminKKTabs({
  kkRows,
  quotaRows,
  totalEnrolled,
}: {
  kkRows: KKRow[];
  quotaRows: QuotaRow[];
  totalEnrolled: number;
}) {
  const [tab, setTab] = useState<"kk" | "quota">("kk");

  return (
    <div className="space-y-4">
      {/* Tab nav */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setTab("kk")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "kk"
              ? "border-[#C8102E] text-[#C8102E]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Penugasan Ketua KK
        </button>
        <button
          onClick={() => setTab("quota")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "quota"
              ? "border-[#C8102E] text-[#C8102E]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Pengaturan Kuota Dosen
        </button>
      </div>

      {tab === "kk" && <KetuaKKManager rows={kkRows} totalEnrolled={totalEnrolled} />}

      {tab === "quota" && (
        <div className="space-y-3">
          <div className="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            Kuota di sini menentukan batas maksimal mahasiswa bimbingan per dosen.
            Ketua KK hanya dapat <strong>melihat</strong> kuota — pengubahan harus dilakukan oleh Admin di halaman ini.
          </div>
          <QuotaEditor dosenList={quotaRows} />
        </div>
      )}
    </div>
  );
}
