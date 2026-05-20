"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import { toast } from "sonner";
import { uploadRevision } from "@/lib/actions/proposal";
import { CheckCircle2 } from "lucide-react";

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

type DeskEval = {
  latarBelakang: number;
  formulasiMasalah: number;
  teoriPendukung: number;
  ideMetode: number;
  catatanReviewer: string | null;
  isLate: boolean;
  evaluator: { name: string };
};

type Proposal = {
  id: string;
  status: string;
  revisionUrl: string | null;
  presentationUrl: string | null;
  deskEvaluation: DeskEval | null;
};

export function RevisiUpload({ proposal }: { proposal: Proposal }) {
  const router = useRouter();

  const [revisionLink, setRevisionLink] = useState(proposal.revisionUrl ?? "");
  const [presentationLink, setPresentationLink] = useState(
    proposal.presentationUrl ?? ""
  );
  const [loading, setLoading] = useState(false);

  const canUpload = ["DE_COMPLETED", "REVISION_UPLOADED"].includes(
    proposal.status
  );

  const revisionValid = isValidUrl(revisionLink);
  const presentationValid = isValidUrl(presentationLink);

  const handleSubmit = async () => {
    if (!revisionValid) {
      toast.error("Masukkan link file proposal revisi yang valid");
      return;
    }
    if (!presentationValid) {
      toast.error("Masukkan link file presentasi yang valid");
      return;
    }
    setLoading(true);
    try {
      const result = await uploadRevision(
        proposal.id,
        revisionLink,
        presentationLink
      );
      if ("error" in result) {
        toast.error(String(result.error));
      } else {
        toast.success("Link revisi berhasil disimpan!");
        router.refresh();
      }
    } catch {
      toast.error("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const de = proposal.deskEvaluation;
  const finalScore = de
    ? de.latarBelakang + de.formulasiMasalah + de.teoriPendukung + de.ideMetode
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <StatusBadge status={proposal.status} type="proposal" />
      </div>

      {de ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hasil Desk Evaluation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Latar Belakang</p>
                <p className="font-semibold">{de.latarBelakang}</p>
              </div>
              <div>
                <p className="text-gray-500">Formulasi Masalah</p>
                <p className="font-semibold">{de.formulasiMasalah}</p>
              </div>
              <div>
                <p className="text-gray-500">Teori Pendukung</p>
                <p className="font-semibold">{de.teoriPendukung}</p>
              </div>
              <div>
                <p className="text-gray-500">Ide & Metode</p>
                <p className="font-semibold">{de.ideMetode}</p>
              </div>
            </div>
            <div className="border-t pt-3">
              <p className="text-sm text-gray-500">Nilai DE</p>
              <p className="text-2xl font-bold text-gray-900">
                {finalScore?.toFixed(1)}
              </p>
            </div>
            {de.catatanReviewer && (
              <div>
                <p className="text-sm text-gray-500">
                  Catatan Reviewer ({de.evaluator.name})
                </p>
                <p className="text-sm text-gray-800 bg-gray-50 rounded p-3 mt-1">
                  {de.catatanReviewer}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-500 text-sm">
              Desk Evaluation belum selesai.
            </p>
          </CardContent>
        </Card>
      )}

      {canUpload && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Submit Link Revisi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Revision link */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="revisionLink">
                  Link File Proposal (Revisi) *
                </Label>
                {revisionLink && revisionValid && (
                  <a
                    href={revisionLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-green-600 hover:underline"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Buka Link
                  </a>
                )}
              </div>
              <Input
                id="revisionLink"
                type="url"
                placeholder="https://drive.google.com/file/..."
                value={revisionLink}
                onChange={(e) => setRevisionLink(e.target.value)}
              />
            </div>

            {/* Presentation link */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="presentationLink">
                  Link File Presentasi *
                </Label>
                {presentationLink && presentationValid && (
                  <a
                    href={presentationLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-green-600 hover:underline"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Buka Link
                  </a>
                )}
              </div>
              <Input
                id="presentationLink"
                type="url"
                placeholder="https://drive.google.com/file/..."
                value={presentationLink}
                onChange={(e) => setPresentationLink(e.target.value)}
              />
            </div>

            <p className="text-xs text-gray-500">
              Gunakan link Google Drive, OneDrive, atau platform lain. Pastikan
              link dapat diakses oleh siapapun yang memiliki link.
            </p>

            {(!revisionValid || !presentationValid) && (
              <div className="text-xs text-amber-600 bg-amber-50 rounded p-2 space-y-0.5">
                {!revisionLink && <p>• Link file proposal belum diisi</p>}
                {revisionLink && !revisionValid && (
                  <p>• Format link file proposal tidak valid</p>
                )}
                {!presentationLink && <p>• Link file presentasi belum diisi</p>}
                {presentationLink && !presentationValid && (
                  <p>• Format link file presentasi tidak valid</p>
                )}
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={loading || !revisionValid || !presentationValid}
              className="w-full bg-[#C8102E] hover:bg-[#a50d26]"
            >
              {loading ? "Menyimpan..." : "Simpan Link Revisi"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
