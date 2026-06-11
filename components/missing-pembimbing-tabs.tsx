"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UserCheck } from "lucide-react";
import { assignSupervisorsKK } from "@/app/ketua-kk/alokasi-pembimbing/actions";
import { assignPembimbingToHistoricalImport } from "@/lib/actions/pembimbing-queue";

const STATUS_LABELS: Record<string, string> = {
  ENROLLED: "Terdaftar",
  PROPOSAL_UPLOADED: "Proposal Terdaftar",
  ASSIGNED: "Ditugaskan",
  BIMBINGAN: "Bimbingan",
  DE_READY: "Siap DE",
  DE_COMPLETED: "DE Selesai",
  REVISION_UPLOADED: "Revisi",
  SEMINAR_REGISTERED: "Daftar Seminar",
  SEMINAR_COMPLETED: "Seminar Selesai",
  COMPLETED: "Selesai",
};

type ActiveClassRow = {
  id: string;
  status: string;
  nim: string;
  nama: string;
  prodi: string;
  kelas: string;
  semester: string;
};

type ImportedTARow = {
  id: string;
  nim: string;
  nama: string;
  prodi: string;
  importDate: string;
  importBatchId: string | null;
};

type PembimbingOption = {
  id: string;
  name: string;
  bimbinganCount: number;
};

function PembimbingSelects({
  proposalId,
  pembimbingList,
  globalQuota,
  onAssign,
}: {
  proposalId: string;
  pembimbingList: PembimbingOption[];
  globalQuota: number;
  onAssign: (proposalId: string, s1: string, s2: string | null) => Promise<{ error?: string; success?: boolean }>;
}) {
  const [s1, setS1] = useState("");
  const [s2, setS2] = useState("");
  const [loading, setLoading] = useState(false);

  const quotaLabel = (pb: PembimbingOption) => `${pb.name} (${pb.bimbinganCount}/${globalQuota})`;

  const handleAssign = async () => {
    if (!s1) {
      toast.error("Pilih Pembimbing 1 terlebih dahulu");
      return;
    }
    setLoading(true);
    try {
      const res = await onAssign(proposalId, s1, s2 || null);
      if (res.error) toast.error(res.error);
      else toast.success("Pembimbing berhasil ditugaskan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
      <Select onValueChange={(v) => setS1(v as string)}>
        <SelectTrigger className="h-8 text-sm sm:w-56">
          <SelectValue placeholder="Pilih Pembimbing 1" />
        </SelectTrigger>
        <SelectContent>
          {pembimbingList.map((pb) => (
            <SelectItem key={pb.id} value={pb.id} disabled={pb.bimbinganCount >= globalQuota}>
              {quotaLabel(pb)}
              {pb.bimbinganCount >= globalQuota && " – PENUH"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select onValueChange={(v) => setS2(v === "none" ? "" : (v as string))}>
        <SelectTrigger className="h-8 text-sm sm:w-56">
          <SelectValue placeholder="Pembimbing 2 (opsional)" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">– Tidak ada –</SelectItem>
          {pembimbingList.map((pb) => (
            <SelectItem key={pb.id} value={pb.id} disabled={pb.bimbinganCount >= globalQuota}>
              {quotaLabel(pb)}
              {pb.bimbinganCount >= globalQuota && " – PENUH"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" onClick={handleAssign} disabled={loading} className="bg-[#C8102E] hover:bg-[#a50d26]">
        <UserCheck className="mr-1 h-4 w-4" />
        {loading ? "Menyimpan..." : "Tugaskan"}
      </Button>
    </div>
  );
}

export function MissingPembimbingTabs({
  activeClassRows,
  importedTARows,
  pembimbingList,
  globalQuota,
}: {
  activeClassRows: ActiveClassRow[];
  importedTARows: ImportedTARow[];
  pembimbingList: PembimbingOption[];
  globalQuota: number;
}) {
  const [tab, setTab] = useState<"active-class" | "imported-ta2">("active-class");

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setTab("active-class")}
          className={`px-4 py-1.5 text-sm font-medium rounded-t border-b-2 transition-colors ${
            tab === "active-class"
              ? "border-[#C8102E] text-[#C8102E]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Active Class ({activeClassRows.length})
        </button>
        <button
          onClick={() => setTab("imported-ta2")}
          className={`px-4 py-1.5 text-sm font-medium rounded-t border-b-2 transition-colors ${
            tab === "imported-ta2"
              ? "border-[#C8102E] text-[#C8102E]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Imported TA2 ({importedTARows.length})
        </button>
      </div>

      {tab === "active-class" && (
        activeClassRows.length === 0 ? (
          <p className="text-sm text-gray-500">
            Semua mahasiswa di kelas aktif sudah memiliki Pembimbing 1.
          </p>
        ) : (
          <div className="space-y-3">
            {activeClassRows.map((r) => (
              <Card key={r.id}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                      {r.prodi} · {r.kelas}
                    </span>
                    <span className="font-medium text-gray-900">{r.nama}</span>
                    <span className="text-xs text-gray-500">{r.nim}</span>
                    <span className="text-xs text-gray-400">Semester {r.semester}</span>
                    <span className="ml-auto text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </div>
                  <PembimbingSelects
                    proposalId={r.id}
                    pembimbingList={pembimbingList}
                    globalQuota={globalQuota}
                    onAssign={(id, s1, s2) => assignSupervisorsKK(id, s1, s2)}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {tab === "imported-ta2" && (
        importedTARows.length === 0 ? (
          <p className="text-sm text-gray-500">
            Semua mahasiswa Tugas Akhir - Past sudah memiliki Pembimbing 1.
          </p>
        ) : (
          <div className="space-y-3">
            {importedTARows.map((r) => (
              <Card key={r.id}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{r.prodi}</span>
                    <span className="font-medium text-gray-900">{r.nama}</span>
                    <span className="text-xs text-gray-500">{r.nim}</span>
                    <span className="text-xs text-gray-400">
                      Import: {new Date(r.importDate).toLocaleDateString("id-ID")}
                    </span>
                    <span className="ml-auto text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                      BELUM DITETAPKAN
                    </span>
                  </div>
                  <PembimbingSelects
                    proposalId={r.id}
                    pembimbingList={pembimbingList}
                    globalQuota={globalQuota}
                    onAssign={(id, s1, s2) => assignPembimbingToHistoricalImport(id, s1, s2)}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}
