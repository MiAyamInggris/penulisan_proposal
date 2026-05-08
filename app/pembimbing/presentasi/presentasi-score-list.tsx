"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { saveNilaiPresentasi } from "./actions";
import { Pencil } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const CRITERIA = [
  { name: "latarBelakangScore", label: "Menjawab Latar Belakang, Rumusan, Tujuan & Metodologi", max: 25 },
  { name: "teoriPendukungScore", label: "Menguasai Teori Pendukung TA", max: 15 },
  { name: "toolsPemodelanScore", label: "Menguasai Tools Pemodelan/Simulasi/Implementasi", max: 10 },
  { name: "pemaparanScore", label: "Pemaparan / Cara Menjawab", max: 25 },
  { name: "komunikasiScore", label: "Komunikasi Interpersonal", max: 25 },
];

type NilaiPresentasi = {
  latarBelakangScore: number;
  teoriPendukungScore: number;
  toolsPemodelanScore: number;
  pemaparanScore: number;
  komunikasiScore: number;
};

type Proposal = {
  id: string;
  titleId: string;
  status: string;
  enrollment: {
    student: { name: string; identifier: string };
    class: { code: string };
  };
  seminar: {
    id: string;
    scheduledDate: Date;
    location: string | null;
    nilaiPresentasi: NilaiPresentasi[];
  } | null;
};

function PresentasiForm({ proposalId, seminarId, existing, onClose }: {
  proposalId: string; seminarId: string; existing: NilaiPresentasi | null; onClose: () => void;
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
      const result = await saveNilaiPresentasi(seminarId, proposalId, new FormData(e.currentTarget));
      if ("error" in result) toast.error(String(result.error));
      else { toast.success("Nilai presentasi disimpan"); onClose(); }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
              setScores((prev) => ({ ...prev, [c.name]: Math.min(c.max, Math.max(0, parseFloat(e.target.value) || 0)) }))
            }
            required
          />
        </div>
      ))}
      <div className="p-3 bg-gray-50 rounded-lg flex justify-between">
        <span className="text-sm font-medium">Total</span>
        <span className="text-lg font-bold">{total.toFixed(1)} / 100</span>
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-[#C8102E] hover:bg-[#a50d26]">
        {loading ? "Menyimpan..." : "Simpan Nilai Presentasi"}
      </Button>
    </form>
  );
}

export function PresentasiScoreList({ proposals }: { proposals: Proposal[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (proposals.length === 0) {
    return <p className="text-gray-500">Tidak ada mahasiswa dengan seminar terjadwal.</p>;
  }

  return (
    <div className="space-y-3">
      {proposals.map((p) => {
        const existing = p.seminar?.nilaiPresentasi[0] ?? null;
        const total = existing
          ? [existing.latarBelakangScore, existing.teoriPendukungScore, existing.toolsPemodelanScore, existing.pemaparanScore, existing.komunikasiScore].reduce((a, b) => a + b, 0)
          : null;

        return (
          <Card key={p.id}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{p.enrollment.class.code}</span>
                    <span className="font-medium">{p.enrollment.student.name}</span>
                  </div>
                  {p.seminar && (
                    <p className="text-xs text-gray-500">
                      Seminar: {format(new Date(p.seminar.scheduledDate), "dd MMM yyyy HH:mm", { locale: idLocale })}
                      {p.seminar.location && ` – ${p.seminar.location}`}
                    </p>
                  )}
                  {total !== null && <p className="text-sm">Nilai: <span className="font-bold">{total.toFixed(1)}/100</span></p>}
                </div>
                {p.seminar && (
                  <Button
                    size="sm"
                    variant={existing ? "outline" : "default"}
                    className={existing ? "" : "bg-[#C8102E] hover:bg-[#a50d26]"}
                    onClick={() => setOpenId(p.id)}
                  >
                    <Pencil className="mr-1 h-4 w-4" />
                    {existing ? "Edit" : "Nilai"}
                  </Button>
                )}
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
                Nilai Presentasi – {proposals.find((p) => p.id === openId)?.enrollment.student.name}
              </DialogTitle>
            </DialogHeader>
            {(() => {
              const p = proposals.find((x) => x.id === openId);
              return p?.seminar ? (
                <PresentasiForm
                  proposalId={p.id}
                  seminarId={p.seminar.id}
                  existing={p.seminar.nilaiPresentasi[0] ?? null}
                  onClose={() => setOpenId(null)}
                />
              ) : null;
            })()}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
