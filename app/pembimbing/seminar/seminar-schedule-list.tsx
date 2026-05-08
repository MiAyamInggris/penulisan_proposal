"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/status-badge";
import { toast } from "sonner";
import { scheduleSeminar } from "./actions";
import { CalendarPlus } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

type Proposal = {
  id: string;
  titleId: string;
  status: string;
  enrollment: {
    student: { name: string; identifier: string };
    class: { code: string };
  };
  seminar: {
    scheduledDate: Date | null;
    location: string | null;
    status: string;
  } | null;
};

function SeminarForm({ proposal, onClose }: { proposal: Proposal; onClose: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await scheduleSeminar(proposal.id, new FormData(e.currentTarget));
      if ("error" in result) toast.error(String(result.error));
      else { toast.success("Seminar berhasil dijadwalkan"); onClose(); }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="scheduledDate">Tanggal & Waktu Seminar *</Label>
        <Input
          id="scheduledDate"
          name="scheduledDate"
          type="datetime-local"
          defaultValue={proposal.seminar?.scheduledDate ? new Date(proposal.seminar.scheduledDate).toISOString().slice(0, 16) : ""}
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="location">Lokasi</Label>
        <Input
          id="location"
          name="location"
          placeholder="Contoh: Ruang Sidang A, Gedung B"
          defaultValue={proposal.seminar?.location ?? ""}
        />
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-[#C8102E] hover:bg-[#a50d26]">
        {loading ? "Menyimpan..." : proposal.seminar ? "Perbarui Jadwal" : "Jadwalkan Seminar"}
      </Button>
    </form>
  );
}

export function SeminarScheduleList({ proposals }: { proposals: Proposal[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (proposals.length === 0) {
    return <p className="text-gray-500">Tidak ada mahasiswa yang perlu dijadwalkan seminarnya.</p>;
  }

  return (
    <div className="space-y-3">
      {proposals.map((p) => (
        <Card key={p.id}>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{p.enrollment.class.code}</span>
                  <span className="font-medium">{p.enrollment.student.name}</span>
                  <StatusBadge status={p.status} type="proposal" />
                </div>
                <p className="text-sm text-gray-600 line-clamp-1">{p.titleId}</p>
                {p.seminar ? (
                  <p className="text-sm text-green-700">
                    📅 {p.seminar.scheduledDate ? format(new Date(p.seminar.scheduledDate), "dd MMMM yyyy HH:mm", { locale: idLocale }) : "Tanggal belum ditetapkan"}
                    {p.seminar.location && ` – ${p.seminar.location}`}
                  </p>
                ) : (
                  <p className="text-sm text-yellow-600">Belum dijadwalkan</p>
                )}
              </div>
              <Button
                size="sm"
                className="bg-[#C8102E] hover:bg-[#a50d26]"
                onClick={() => setOpenId(p.id)}
              >
                <CalendarPlus className="mr-1 h-4 w-4" />
                {p.seminar ? "Edit Jadwal" : "Jadwalkan"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {openId && (
        <Dialog open={!!openId} onOpenChange={(v) => { if (!v) setOpenId(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Jadwalkan Seminar – {proposals.find((p) => p.id === openId)?.enrollment.student.name}
              </DialogTitle>
            </DialogHeader>
            <SeminarForm proposal={proposals.find((p) => p.id === openId)!} onClose={() => setOpenId(null)} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
