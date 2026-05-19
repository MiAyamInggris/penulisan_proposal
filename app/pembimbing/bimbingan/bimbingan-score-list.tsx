"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { saveNilaiBimbingan } from "./actions";
import { Pencil } from "lucide-react";

const GROUPS = [
  {
    label: "Substansi Proposal",
    criteria: [
      { name: "pemilihanTema", label: "Pemilihan Tema", max: 15 },
      { name: "researchQuestion", label: "Pertanyaan Penelitian (Research Question)", max: 15 },
      { name: "studiLiteratur1", label: "Studi Literatur – Ide/Gagasan/Strategi", max: 10 },
      { name: "studiLiteratur2", label: "Studi Literatur – Justifikasi Model/Metode", max: 10 },
      { name: "rencanaImplementasi", label: "Rencana Implementasi/Simulasi/Komputasi", max: 10 },
    ],
  },
  {
    label: "Proses & Kemandirian",
    criteria: [
      { name: "kemandirian", label: "Kemandirian Mahasiswa dalam Penyusunan Proposal", max: 20 },
      { name: "prosesBimbingan", label: "Proses Bimbingan", max: 20 },
    ],
  },
];

const CRITERIA = GROUPS.flatMap((g) => g.criteria);

type NilaiBimbingan = {
  pemilihanTema: number;
  researchQuestion: number;
  studiLiteratur1: number;
  studiLiteratur2: number;
  rencanaImplementasi: number;
  kemandirian: number;
  prosesBimbingan: number;
  notes: string | null;
};

type Proposal = {
  id: string;
  titleId: string;
  status: string;
  enrollment: {
    student: { name: string; identifier: string };
    class: { code: string };
  };
  bimbinganSessions: { id: string; sessionNumber: number }[];
  nilaiBimbingan: NilaiBimbingan[];
};

function ScoreForm({ proposal, existing, onClose }: { proposal: Proposal; existing: NilaiBimbingan | null; onClose: () => void }) {
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
      const result = await saveNilaiBimbingan(proposal.id, new FormData(e.currentTarget));
      if ("error" in result) toast.error(String(result.error));
      else { toast.success("Nilai bimbingan berhasil disimpan"); onClose(); }
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
        <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
          Catatan
        </Label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={existing?.notes ?? ""}
          rows={3}
          placeholder="Catatan untuk mahasiswa (opsional)..."
          className="resize-none"
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full bg-[#C8102E] hover:bg-[#a50d26] h-11">
        {loading ? "Menyimpan..." : "Simpan Nilai Bimbingan"}
      </Button>
    </form>
  );
}

export function BimbinganScoreList({ proposals }: { proposals: Proposal[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (proposals.length === 0) {
    return <p className="text-gray-500">Belum ada mahasiswa yang ditugaskan kepada Anda.</p>;
  }

  return (
    <div className="space-y-3">
      {proposals.map((p) => {
        const existing = p.nilaiBimbingan[0] ?? null;
        const total = existing
          ? CRITERIA.map((c) => (existing as unknown as Record<string, number>)[c.name]).reduce((a, b) => a + b, 0)
          : null;

        return (
          <Card key={p.id}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{p.enrollment.class.code}</span>
                    <span className="font-medium">{p.enrollment.student.name}</span>
                    <span className="text-xs text-gray-500">{p.enrollment.student.identifier}</span>
                  </div>
                  <p className="text-xs text-gray-500">Sesi bimbingan: {p.bimbinganSessions.length}</p>
                  {total !== null && (
                    <p className="text-sm">Nilai: <span className="font-bold">{total.toFixed(1)}/100</span></p>
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
            </CardContent>
          </Card>
        );
      })}

      {openId && (
        <Dialog open={!!openId} onOpenChange={(v) => { if (!v) setOpenId(null); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Nilai Bimbingan – {proposals.find((p) => p.id === openId)?.enrollment.student.name}
              </DialogTitle>
            </DialogHeader>
            <ScoreForm
              proposal={proposals.find((p) => p.id === openId)!}
              existing={proposals.find((p) => p.id === openId)?.nilaiBimbingan[0] ?? null}
              onClose={() => setOpenId(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
