"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { submitDeskEvaluation } from "../actions";

export function DEForm({ proposal }: { proposal: any }) {
  const router = useRouter();
  const de = proposal.deskEvaluation;
  const [loading, setLoading] = useState(false);
  
  const [scores, setScores] = useState({
    latarBelakang: de?.latarBelakang || 0,
    formulasiMasalah: de?.formulasiMasalah || 0,
    teoriPendukung: de?.teoriPendukung || 0,
    ideMetode: de?.ideMetode || 0,
    catatanReviewer: de?.catatanReviewer || "",
  });

  const CRITERIA = [
    { key: "latarBelakang" as const, label: "Latar Belakang", sub: "Motivasi · Kemanfaatan/Dampak", max: 25 },
    { key: "formulasiMasalah" as const, label: "Formulasi Masalah", sub: "Tujuan · Hipotesis · Batasan/Asumsi · Kelayakan Waktu & Sarana", max: 30 },
    { key: "teoriPendukung" as const, label: "Teori Pendukung / Penelusuran Literatur", sub: "", max: 30 },
    { key: "ideMetode" as const, label: "Ide/Metode Penyelesaian Masalah", sub: "", max: 15 },
  ];

  const total = scores.latarBelakang + scores.formulasiMasalah + scores.teoriPendukung + scores.ideMetode;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await submitDeskEvaluation({
        proposalId: proposal.id,
        ...scores,
      });
      toast.success("Penilaian berhasil disimpan");
      router.push("/dosen/desk-evaluation-assessment");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Gagal menyimpan penilaian");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Komponen Penilaian (Total Maks. 100)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {CRITERIA.map((c) => (
              <div key={c.key} className="space-y-2">
                <div>
                  <Label htmlFor={c.key}>{c.label} <span className="text-gray-400 font-normal">(Maks. {c.max})</span></Label>
                  {c.sub && <p className="text-xs text-gray-500 mt-0.5">{c.sub}</p>}
                </div>
                <Input
                  id={c.key}
                  type="number"
                  min="0"
                  max={c.max}
                  step="0.5"
                  value={scores[c.key]}
                  onChange={(e) =>
                    setScores({ ...scores, [c.key]: Math.min(c.max, Math.max(0, parseFloat(e.target.value) || 0)) })
                  }
                  required
                />
              </div>
            ))}
          </div>

          <div className="pt-4 border-t">
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-700">Total Skor:</span>
              <span className={`text-2xl font-bold ${total >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                {total.toFixed(1)}
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-4">
            <Label htmlFor="catatan">Catatan / Review untuk Mahasiswa</Label>
            <Textarea
              id="catatan"
              placeholder="Berikan saran atau perbaikan untuk proposal ini..."
              rows={4}
              value={scores.catatanReviewer}
              onChange={(e) => setScores({ ...scores, catatanReviewer: e.target.value })}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3 bg-gray-50 rounded-b-lg py-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.back()}
            disabled={loading}
          >
            Batal
          </Button>
          <Button 
            type="submit" 
            className="bg-[#C8102E] hover:bg-[#a50d26]"
            disabled={loading}
          >
            {loading ? "Menyimpan..." : "Simpan Penilaian"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
