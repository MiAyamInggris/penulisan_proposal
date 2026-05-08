"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { updateProgram } from "./actions";
import { Pencil } from "lucide-react";

type Program = {
  id: string;
  name: string;
  code: string;
  literatureReviewPct: number;
  bimbinganPct: number;
  deskEvaluationPct: number;
  presentasiPct: number;
};

export function ProgramCard({ program }: { program: Program }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    const lr = parseFloat(formData.get("literatureReviewPct") as string);
    const bimbingan = parseFloat(formData.get("bimbinganPct") as string);
    const de = parseFloat(formData.get("deskEvaluationPct") as string);
    const presentasi = parseFloat(formData.get("presentasiPct") as string);

    if (lr + bimbingan + de + presentasi !== 100) {
      toast.error("Total bobot harus 100%");
      setLoading(false);
      return;
    }

    try {
      await updateProgram(program.id, formData);
      toast.success("Program studi berhasil diperbarui");
      setOpen(false);
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-[#C8102E] text-white text-sm rounded">
            {program.code}
          </span>
          {program.name}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <Pencil className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="pb-2 font-medium">Komponen</th>
              <th className="pb-2 font-medium text-right">Bobot</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr>
              <td className="py-2">Literature Review (TA1-05)</td>
              <td className="py-2 text-right font-semibold">{program.literatureReviewPct}%</td>
            </tr>
            <tr>
              <td className="py-2">Keaktifan Bimbingan (TA1-01B)</td>
              <td className="py-2 text-right font-semibold">{program.bimbinganPct}%</td>
            </tr>
            <tr>
              <td className="py-2">Desk Evaluation (TA1-02)</td>
              <td className="py-2 text-right font-semibold">{program.deskEvaluationPct}%</td>
            </tr>
            <tr>
              <td className="py-2">Presentasi Seminar (TA1-03)</td>
              <td className="py-2 text-right font-semibold">{program.presentasiPct}%</td>
            </tr>
            <tr className="font-bold text-[#C8102E]">
              <td className="pt-3">Total</td>
              <td className="pt-3 text-right">
                {program.literatureReviewPct + program.bimbinganPct + program.deskEvaluationPct + program.presentasiPct}%
              </td>
            </tr>
          </tbody>
        </table>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Bobot Penilaian – {program.code}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="lr">Literature Review (%)</Label>
                <Input id="lr" name="literatureReviewPct" type="number" step="0.1" defaultValue={program.literatureReviewPct} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="bimbingan">Keaktifan Bimbingan (%)</Label>
                <Input id="bimbingan" name="bimbinganPct" type="number" step="0.1" defaultValue={program.bimbinganPct} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="de">Desk Evaluation (%)</Label>
                <Input id="de" name="deskEvaluationPct" type="number" step="0.1" defaultValue={program.deskEvaluationPct} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="presentasi">Presentasi Seminar (%)</Label>
                <Input id="presentasi" name="presentasiPct" type="number" step="0.1" defaultValue={program.presentasiPct} required />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#C8102E] hover:bg-[#a50d26]"
              >
                {loading ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
