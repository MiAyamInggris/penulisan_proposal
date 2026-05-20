"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { AlertTriangle, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { registerForSeminar } from "@/lib/actions/proposal";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

type Enrollment = {
  proposal: {
    id: string;
    status: string;
    revisionUrl: string | null;
    presentationUrl: string | null;
    bimbinganSessions: { id: string }[];
    seminar: {
      status: string;
      scheduledDate: Date | null;
      location: string | null;
    } | null;
  } | null;
  eprt: { status: string } | null;
} | null;

function Req({ met, label }: { met: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {met ? (
        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 text-red-400 shrink-0" />
      )}
      <span className={met ? "text-gray-800" : "text-gray-400"}>{label}</span>
    </div>
  );
}

export function SeminarRegister({ enrollment }: { enrollment: Enrollment }) {
  const [loading, setLoading] = useState(false);
  const proposal = enrollment?.proposal;

  if (!proposal) {
    return (
      <p className="text-gray-500">Daftarkan proposal terlebih dahulu.</p>
    );
  }

  const bimbinganCount = proposal.bimbinganSessions.length;
  const eprtVerified = enrollment?.eprt?.status === "VERIFIED";
  const hasRevision = !!proposal.revisionUrl;
  const hasPresentation = !!proposal.presentationUrl;
  const allMet =
    bimbinganCount >= 3 &&
    eprtVerified &&
    hasRevision &&
    hasPresentation;

  const alreadyRegistered = [
    "SEMINAR_REGISTERED",
    "SEMINAR_COMPLETED",
    "COMPLETED",
  ].includes(proposal.status);

  const handleRegister = async () => {
    setLoading(true);
    try {
      const result = await registerForSeminar(proposal.id);
      if ("error" in result) toast.error(String(result.error));
      else toast.success("Berhasil mendaftar seminar!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <StatusBadge status={proposal.status} type="proposal" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Syarat Pendaftaran Seminar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Req
            met={bimbinganCount >= 3}
            label={`Minimal 3 sesi bimbingan (${bimbinganCount}/3)`}
          />
          <Req met={eprtVerified} label="EpRT terverifikasi" />
          <Req met={hasRevision} label="Link revisi proposal disimpan" />
          <Req met={hasPresentation} label="Link file presentasi disimpan" />
          <div className="flex items-start gap-2 text-sm pt-1">
            <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
            <span className="text-yellow-700">
              Silahkan unggah proposal yang disetujui ke iGracias
            </span>
          </div>
        </CardContent>
      </Card>

      {alreadyRegistered ? (
        <Card>
          <CardContent className="pt-6">
            {proposal.seminar?.scheduledDate ? (
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900">
                    Seminar Dijadwalkan
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {format(
                      new Date(proposal.seminar.scheduledDate),
                      "dd MMMM yyyy HH:mm",
                      { locale: idLocale }
                    )}
                  </p>
                  {proposal.seminar.location && (
                    <p className="text-sm text-gray-500 mt-0.5">
                      {proposal.seminar.location}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-blue-600 text-sm">
                Pendaftaran diterima. Menunggu penjadwalan dari pembimbing.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Button
          onClick={handleRegister}
          disabled={!allMet || loading}
          className="w-full bg-[#C8102E] hover:bg-[#a50d26]"
        >
          {loading ? "Mendaftar..." : "Daftar Seminar Proposal"}
        </Button>
      )}
    </div>
  );
}
