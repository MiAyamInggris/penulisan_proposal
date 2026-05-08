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

const CRITERIA = [
  { name: "kualitasPustaka", label: "Kualitas Pustaka sebagai Referensi Utama", max: 10 },
  { name: "kontenRumusan", label: "Konten Pustaka mengenai Rumusan Masalah", max: 10 },
  { name: "analisisTujuan", label: "Analisis Pustaka terkait Tujuan/Ide Pokok", max: 10 },
  { name: "kelengkapanKajian", label: "Kelengkapan Kajian Teori Metode/Algoritma", max: 10 },
  { name: "kelebihanKekurangan", label: "Kelebihan dan Kekurangan Penelitian", max: 40 },
  { name: "relasiTeori", label: "Relasi Teori terhadap Topik Proposal", max: 20 },
];

type NilaiLR = {
  kualitasPustaka: number;
  kontenRumusan: number;
  analisisTujuan: number;
  kelengkapanKajian: number;
  kelebihanKekurangan: number;
  relasiTeori: number;
  catatan: string | null;
};

type Proposal = {
  id: string;
  titleId: string;
  enrollment: {
    student: { name: string; identifier: string };
    class: { code: string };
  };
  nilaiLiteratureReview: NilaiLR[];
};

function LRForm({ proposalId, existing, onClose }: { proposalId: string; existing: NilaiLR | null; onClose: () => void }) {
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
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      {CRITERIA.map((c) => (
        <div key={c.name} className="space-y-1">
          <div className="flex justify-between">
            <Label htmlFor={c.name} className="text-sm">{c.label}</Label>
            <span className="text-xs text-gray-500">Maks: {c.max}</span>
          </div>
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
          />
        </div>
      ))}
      <div className="p-3 bg-gray-50 rounded-lg flex justify-between">
        <span className="text-sm font-medium">Total</span>
        <span className="text-lg font-bold">{total.toFixed(1)} / 100</span>
      </div>
      <div className="space-y-1">
        <Label>Catatan Reviewer</Label>
        <Textarea name="catatan" defaultValue={existing?.catatan ?? ""} rows={2} />
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-[#C8102E] hover:bg-[#a50d26]">
        {loading ? "Menyimpan..." : "Simpan Nilai LR"}
      </Button>
    </form>
  );
}

export function LRScoreList({ proposals }: { proposals: Proposal[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (proposals.length === 0) {
    return <p className="text-gray-500">Belum ada mahasiswa yang ditugaskan kepada Anda.</p>;
  }

  return (
    <div className="space-y-3">
      {proposals.map((p) => {
        const existing = p.nilaiLiteratureReview[0] ?? null;
        const total = existing
          ? [existing.kualitasPustaka, existing.kontenRumusan, existing.analisisTujuan, existing.kelengkapanKajian, existing.kelebihanKekurangan, existing.relasiTeori].reduce((a, b) => a + b, 0)
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
                  {total !== null && <p className="text-sm mt-1">Nilai LR: <span className="font-bold">{total.toFixed(1)}/100</span></p>}
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
            </CardContent>
          </Card>
        );
      })}

      {openId && (
        <Dialog open={!!openId} onOpenChange={(v) => { if (!v) setOpenId(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                Literature Review – {proposals.find((p) => p.id === openId)?.enrollment.student.name}
              </DialogTitle>
            </DialogHeader>
            <LRForm
              proposalId={openId}
              existing={proposals.find((p) => p.id === openId)?.nilaiLiteratureReview[0] ?? null}
              onClose={() => setOpenId(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
