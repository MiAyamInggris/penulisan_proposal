"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { saveNilaiLR } from "./actions";
import { Pencil } from "lucide-react";
import { OtherPembimbingPanel, type OtherPembimbingData } from "@/app/pembimbing/_components/other-pembimbing-panel";

const GROUPS = [
  {
    label: "Kualitas Pustaka",
    criteria: [
      { name: "kualitasPustaka", label: "Kualitas Pustaka sebagai Referensi Utama", max: 10 },
      { name: "kontenRumusan", label: "Konten Pustaka mengenai Rumusan Masalah", max: 10 },
      { name: "analisisTujuan", label: "Analisis Pustaka terkait Tujuan/Ide Pokok", max: 10 },
      { name: "kelengkapanKajian", label: "Kelengkapan Kajian Teori Metode/Algoritma", max: 10 },
    ],
  },
  {
    label: "Evaluasi & Relevansi",
    criteria: [
      { name: "kelebihanKekurangan", label: "Kelebihan dan Kekurangan Penelitian", max: 40 },
      { name: "relasiTeori", label: "Relasi Teori terhadap Topik Proposal", max: 20 },
    ],
  },
];

const CRITERIA = GROUPS.flatMap((g) => g.criteria);

type NilaiLR = {
  kualitasPustaka: number;
  kontenRumusan: number;
  analisisTujuan: number;
  kelengkapanKajian: number;
  kelebihanKekurangan: number;
  relasiTeori: number;
  catatan: string | null;
  updatedAt: string;
};

export type LRProposalRow = {
  id: string;
  titleId: string;
  enrollment: {
    student: { name: string; identifier: string };
    class: { code: string };
  };
  myScore: NilaiLR | null;
  otherPembimbing: OtherPembimbingData | null;
};

function LRForm({
  proposalId,
  existing,
  onClose,
}: {
  proposalId: string;
  existing: NilaiLR | null;
  onClose: () => void;
}) {
  const initScores = Object.fromEntries(
    CRITERIA.map((c) => [c.name, (existing as Record<string, unknown> | null)?.[c.name] as number ?? 0])
  );
  const [scores, setScores] = useState<Record<string, number>>(initScores);
  const [loading, setLoading] = useState(false);
  const total = Object.values(scores).reduce((a, b) => a + b, 0);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await saveNilaiLR(proposalId, new FormData(e.currentTarget));
      if ("error" in result) toast.error(String(result.error));
      else { toast.success("Nilai LR disimpan"); onClose(); }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {GROUPS.map((g) => (
        <div key={g.label} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 px-1">
            {g.label}
          </p>
          <div className="rounded-lg border divide-y overflow-hidden">
            {g.criteria.map((c) => (
              <div
                key={c.name}
                className="flex items-center gap-4 px-4 py-3 bg-white hover:bg-gray-50 transition-colors"
              >
                <Label
                  htmlFor={c.name}
                  className="flex-1 text-sm font-normal text-gray-800 cursor-pointer leading-snug"
                >
                  {c.label}
                </Label>
                <span className="text-xs text-gray-400 shrink-0 w-14 text-right">
                  Maks {c.max}
                </span>
                <Input
                  id={c.name}
                  name={c.name}
                  type="number"
                  min={0}
                  max={c.max}
                  step={0.5}
                  value={scores[c.name]}
                  onChange={(e) =>
                    setScores((prev) => ({
                      ...prev,
                      [c.name]: Math.min(c.max, Math.max(0, parseFloat(e.target.value) || 0)),
                    }))
                  }
                  required
                  className="w-20 text-center shrink-0"
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between rounded-lg border bg-gray-50 px-5 py-4">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-700">Total Nilai</p>
          <div className="h-2 w-48 rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#C8102E] transition-all duration-300"
              style={{ width: `${Math.min(100, total)}%` }}
            />
          </div>
        </div>
        <div className="text-right">
          <span className="text-3xl font-bold text-gray-900">{total.toFixed(1)}</span>
          <span className="text-sm text-gray-400 ml-1">/ 100</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-gray-700">Catatan Reviewer</Label>
        <Textarea
          name="catatan"
          defaultValue={existing?.catatan ?? ""}
          rows={3}
          placeholder="Catatan dan saran untuk mahasiswa (opsional)..."
          className="resize-none"
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full bg-[#C8102E] hover:bg-[#a50d26] h-11">
        {loading ? "Menyimpan..." : "Simpan Nilai Literature Review"}
      </Button>
    </form>
  );
}

export function LRScoreList({ proposals }: { proposals: LRProposalRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (proposals.length === 0) {
    return <p className="text-gray-500">Belum ada mahasiswa yang ditugaskan kepada Anda.</p>;
  }

  return (
    <div className="space-y-3">
      {proposals.map((p) => {
        const existing = p.myScore;
        const total = existing
          ? CRITERIA.map((c) => (existing as unknown as Record<string, number>)[c.name]).reduce((a, b) => a + b, 0)
          : null;

        return (
          <Card key={p.id}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{p.enrollment.class.code}</span>
                    <span className="font-medium">{p.enrollment.student.name}</span>
                  </div>
                  {total !== null && (
                    <p className="text-sm mt-1">
                      Nilai LR: <span className="font-bold">{total.toFixed(1)}/100</span>
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={existing ? "outline" : "default"}
                  className={existing ? "" : "bg-[#C8102E] hover:bg-[#a50d26]"}
                  onClick={() => setOpenId(p.id)}
                >
                  <Pencil className="mr-1 h-4 w-4" />
                  {existing ? "Edit" : "Nilai"}
                </Button>
              </div>

              {p.otherPembimbing && (
                <OtherPembimbingPanel data={p.otherPembimbing} />
              )}
            </CardContent>
          </Card>
        );
      })}

      {openId && (
        <Dialog open={!!openId} onOpenChange={(v) => { if (!v) setOpenId(null); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Literature Review – {proposals.find((p) => p.id === openId)?.enrollment.student.name}
              </DialogTitle>
            </DialogHeader>
            <LRForm
              proposalId={openId}
              existing={proposals.find((p) => p.id === openId)?.myScore ?? null}
              onClose={() => setOpenId(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
