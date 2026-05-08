"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/status-badge";
import { toast } from "sonner";
import { scoreDeskEvaluation } from "./actions";
import { Pencil } from "lucide-react";

type Proposal = {
  id: string;
  titleId: string;
  status: string;
  enrollment: {
    student: { name: string; identifier: string };
    class: { code: string; deDeadline: Date | null };
  };
  deskEvaluation: {
    latarBelakang: number;
    formulasiMasalah: number;
    teoriPendukung: number;
    ideMetode: number;
    isLate: boolean;
    catatanReviewer: string | null;
  } | null;
};

const CRITERIA = [
  { name: "latarBelakang", label: "Latar Belakang (Motivasi + Dampak)", max: 25 },
  { name: "formulasiMasalah", label: "Formulasi Masalah (Tujuan + Hipotesis + Batasan)", max: 30 },
  { name: "teoriPendukung", label: "Teori Pendukung / Penelusuran Literatur", max: 30 },
  { name: "ideMetode", label: "Ide / Metode Penyelesaian Masalah", max: 15 },
];

function DEForm({ proposal, onClose }: { proposal: Proposal; onClose: () => void }) {
  const de = proposal.deskEvaluation;
  const [scores, setScores] = useState<Record<string, number>>({
    latarBelakang: de?.latarBelakang ?? 0,
    formulasiMasalah: de?.formulasiMasalah ?? 0,
    teoriPendukung: de?.teoriPendukung ?? 0,
    ideMetode: de?.ideMetode ?? 0,
  });
  const [loading, setLoading] = useState(false);

  const rawTotal = Object.values(scores).reduce((a, b) => a + b, 0);
  const isLate = proposal.enrollment.class.deDeadline
    ? new Date() > new Date(proposal.enrollment.class.deDeadline)
    : false;
  const cappedTotal = isLate ? Math.min(rawTotal, 51) : rawTotal;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await scoreDeskEvaluation(proposal.id, new FormData(e.currentTarget));
      if ("error" in result) toast.error(String(result.error));
      else { toast.success("Nilai DE berhasil disimpan"); onClose(); }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isLate && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          ⚠ Proposal dikumpulkan setelah deadline. Nilai akan dibatasi maksimal 51.
        </div>
      )}
      {CRITERIA.map((c) => (
        <div key={c.name} className="space-y-1">
          <div className="flex justify-between">
            <Label htmlFor={c.name}>{c.label}</Label>
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
        <span className="text-sm font-medium text-gray-700">Total Nilai</span>
        <span className={`text-lg font-bold ${isLate && rawTotal > 51 ? "text-red-600" : "text-gray-900"}`}>
          {cappedTotal.toFixed(1)}{isLate && rawTotal > 51 ? ` (dibatasi dari ${rawTotal.toFixed(1)})` : ""}
        </span>
      </div>
      <div className="space-y-1">
        <Label htmlFor="catatanReviewer">Catatan Reviewer / Usulan Perbaikan</Label>
        <Textarea
          id="catatanReviewer"
          name="catatanReviewer"
          defaultValue={de?.catatanReviewer ?? ""}
          rows={3}
          placeholder="Tuliskan catatan dan saran perbaikan..."
        />
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-[#C8102E] hover:bg-[#a50d26]">
        {loading ? "Menyimpan..." : "Simpan Nilai DE"}
      </Button>
    </form>
  );
}

export function DEList({ proposals }: { proposals: Proposal[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (proposals.length === 0) {
    return <p className="text-gray-500">Belum ada proposal yang ditugaskan kepada Anda untuk DE.</p>;
  }

  return (
    <div className="space-y-3">
      {proposals.map((p) => {
        const de = p.deskEvaluation;
        const rawTotal = de
          ? de.latarBelakang + de.formulasiMasalah + de.teoriPendukung + de.ideMetode
          : null;
        const finalScore = de ? (de.isLate ? Math.min(rawTotal!, 51) : rawTotal!) : null;

        return (
          <Card key={p.id}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{p.enrollment.class.code}</span>
                    <span className="font-medium text-gray-900">{p.enrollment.student.name}</span>
                    <span className="text-xs text-gray-500">{p.enrollment.student.identifier}</span>
                    <StatusBadge status={p.status} type="proposal" />
                    {de?.isLate && (
                      <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded">Terlambat</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-1">{p.titleId}</p>
                  {de && (
                    <p className="text-sm">
                      Nilai DE:{" "}
                      <span className="font-bold text-gray-900">
                        {finalScore?.toFixed(1)}
                      </span>
                      {de.isLate && rawTotal! > 51 && (
                        <span className="text-xs text-red-500 ml-1">(raw: {rawTotal?.toFixed(1)})</span>
                      )}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={de ? "outline" : "default"}
                  className={de ? "" : "bg-[#C8102E] hover:bg-[#a50d26]"}
                  onClick={() => setOpenId(p.id)}
                >
                  <Pencil className="mr-1 h-4 w-4" />
                  {de ? "Edit Nilai" : "Nilai"}
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
                Desk Evaluation – {proposals.find((p) => p.id === openId)?.enrollment.student.name}
              </DialogTitle>
            </DialogHeader>
            <DEForm proposal={proposals.find((p) => p.id === openId)!} onClose={() => setOpenId(null)} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
