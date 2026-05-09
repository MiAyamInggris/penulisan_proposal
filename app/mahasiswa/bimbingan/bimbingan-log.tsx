"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { addBimbinganSession } from "./actions";
import { Plus, CalendarDays, Lock } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

type Session = {
  id: string;
  sessionNumber: number;
  date: Date;
  topicsDiscussed: string;
  nextPlan: string;
  notes: string | null;
};

export function BimbinganLog({
  sessions,
  supervisorAssigned,
}: {
  sessions: Session[];
  supervisorAssigned: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await addBimbinganSession(new FormData(e.currentTarget));
      if ("error" in result) {
        toast.error(String(result.error));
      } else {
        toast.success("Sesi bimbingan berhasil dicatat!");
        setOpen(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const count = sessions.length;

  if (!supervisorAssigned) {
    return (
      <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
        <Lock className="h-5 w-5 shrink-0" />
        <div>
          <p className="font-medium">Pembimbing belum ditugaskan</p>
          <p className="text-sm text-yellow-700">
            Log bimbingan baru dapat dicatat setelah Dosen Kelas menugaskan pembimbing untuk proposal Anda.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-white border rounded-lg">
        <div>
          <p className="text-sm text-gray-500">Progress Bimbingan</p>
          <p className={`text-2xl font-bold ${count >= 3 ? "text-green-600" : "text-gray-900"}`}>
            {count} / 3 sesi minimum
          </p>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                i <= count ? "bg-green-500 text-white" : "bg-gray-200 text-gray-400"
              }`}
            >
              {i}
            </div>
          ))}
        </div>
        <Button className="bg-[#C8102E] hover:bg-[#a50d26]" onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Sesi
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Catat Sesi Bimbingan #{count + 1}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="date">Tanggal Bimbingan *</Label>
              <Input
                id="date"
                name="date"
                type="date"
                required
                max={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="topicsDiscussed">Topik yang Dibahas *</Label>
              <Textarea
                id="topicsDiscussed"
                name="topicsDiscussed"
                placeholder="Jelaskan topik yang dibahas dalam sesi ini"
                required
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="nextPlan">Rencana Sesi Berikutnya *</Label>
              <Textarea
                id="nextPlan"
                name="nextPlan"
                placeholder="Apa yang akan dilakukan pada sesi berikutnya"
                required
                rows={2}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="notes">Catatan (opsional)</Label>
              <Textarea id="notes" name="notes" placeholder="Catatan tambahan" rows={2} />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-[#C8102E] hover:bg-[#a50d26]">
              {loading ? "Menyimpan..." : "Simpan Sesi"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {sessions.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Belum ada sesi bimbingan tercatat</p>
          <p className="text-sm">Klik "Tambah Sesi" untuk memulai</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <Card key={session.id}>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-[#C8102E] text-white text-sm flex items-center justify-center font-bold shrink-0">
                      {session.sessionNumber}
                    </span>
                    <span className="text-sm text-gray-500">
                      {format(new Date(session.date), "dd MMMM yyyy", { locale: idLocale })}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Topik Dibahas</p>
                    <p className="text-sm text-gray-800">{session.topicsDiscussed}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Rencana Berikutnya</p>
                    <p className="text-sm text-gray-800">{session.nextPlan}</p>
                  </div>
                  {session.notes && (
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Catatan</p>
                      <p className="text-sm text-gray-600">{session.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
