"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { assignSupervisorsKK } from "./actions";
import { UserCheck, Download, ClipboardX } from "lucide-react";

type ProposalData = {
  id: string;
  titleId: string;
  abstract: string | null;
  proposalUrl: string | null;
  supervisor1Requested: { id: string; name: string } | null;
  supervisor2Requested: { id: string; name: string } | null;
  supervisor1Assigned: { id: string; name: string } | null;
  supervisor2Assigned: { id: string; name: string } | null;
};

type EnrollmentItem = {
  id: string;
  student: { name: string; identifier: string };
  class: { code: string; program: { code: string } };
  proposal: ProposalData | null;
};

type PembimbingOption = {
  id: string;
  name: string;
  bimbinganCount: number;
  maxBimbinganQuota: number;
};

export function AllocateList({
  enrollments,
  pembimbingList,
}: {
  enrollments: EnrollmentItem[];
  pembimbingList: PembimbingOption[];
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<string, { s1: string; s2: string }>>({});

  const getSelection = (proposalId: string, field: "s1" | "s2") =>
    selections[proposalId]?.[field] ?? "";

  const setSelection = (proposalId: string, field: "s1" | "s2", value: string) =>
    setSelections((prev) => ({
      ...prev,
      [proposalId]: { ...(prev[proposalId] ?? { s1: "", s2: "" }), [field]: value },
    }));

  const handleAssign = async (proposalId: string) => {
    const s1 = getSelection(proposalId, "s1");
    const s2 = getSelection(proposalId, "s2");
    if (!s1) { toast.error("Pilih Pembimbing 1 terlebih dahulu"); return; }
    setLoading(proposalId);
    try {
      const res = await assignSupervisorsKK(proposalId, s1, s2 || null);
      if ("error" in res) toast.error(res.error);
      else toast.success("Pembimbing berhasil ditugaskan");
    } finally {
      setLoading(null);
    }
  };

  if (enrollments.length === 0) {
    return <p className="text-gray-500">Belum ada mahasiswa terdaftar.</p>;
  }

  const withProposal = enrollments.filter((e) => e.proposal !== null);
  const withoutProposal = enrollments.filter((e) => e.proposal === null);

  const quotaLabel = (pb: PembimbingOption) =>
    `${pb.name} (${pb.bimbinganCount}/${pb.maxBimbinganQuota})`;

  return (
    <div className="space-y-4">
      {withoutProposal.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Belum mengumpulkan proposal ({withoutProposal.length})
          </p>
          {withoutProposal.map((e) => (
            <Card key={e.id} className="border-dashed border-gray-300 bg-gray-50/50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <ClipboardX className="h-4 w-4 text-gray-400 shrink-0" />
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded shrink-0">
                      {e.class.program.code} · {e.class.code}
                    </span>
                    <span className="font-medium text-gray-900">{e.student.name}</span>
                    <span className="text-xs text-gray-500">{e.student.identifier}</span>
                  </div>
                  <span className="ml-auto shrink-0 text-xs text-gray-400 italic">Belum ada proposal</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {withProposal.length > 0 && (
        <div className="space-y-3">
          {withoutProposal.length > 0 && (
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Sudah mengumpulkan proposal ({withProposal.length})
            </p>
          )}
          {withProposal.map((e) => {
            const p = e.proposal!;
            return (
              <Card key={p.id}>
                <CardContent className="pt-4 space-y-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                        {e.class.program.code} · {e.class.code}
                      </span>
                      <span className="font-medium text-gray-900">{e.student.name}</span>
                      <span className="text-xs text-gray-500">{e.student.identifier}</span>
                      {p.proposalUrl && (
                        <a
                          href={p.proposalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-auto inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                        >
                          <Download className="h-3 w-3" />
                          Proposal PDF
                        </a>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-1">{p.titleId}</p>
                    {p.abstract && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">
                        {p.abstract}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
                    <div>
                      <p className="font-medium mb-0.5">Usulan Mahasiswa</p>
                      <p>Pembimbing 1: {p.supervisor1Requested?.name ?? "–"}</p>
                      <p>Pembimbing 2: {p.supervisor2Requested?.name ?? "–"}</p>
                    </div>
                    <div>
                      <p className="font-medium mb-0.5 text-green-700">Penugasan KK</p>
                      <p className="text-green-700">Pembimbing 1: {p.supervisor1Assigned?.name ?? "Belum ditugaskan"}</p>
                      <p className="text-green-700">Pembimbing 2: {p.supervisor2Assigned?.name ?? "–"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Select
                      defaultValue={p.supervisor1Assigned?.id}
                      onValueChange={(v) => { if (v) setSelection(p.id, "s1", v); }}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Pilih Pembimbing 1" />
                      </SelectTrigger>
                      <SelectContent>
                        {pembimbingList.map((pb) => (
                          <SelectItem
                            key={pb.id}
                            value={pb.id}
                            disabled={pb.bimbinganCount >= pb.maxBimbinganQuota}
                          >
                            {quotaLabel(pb)}
                            {pb.bimbinganCount >= pb.maxBimbinganQuota && " – PENUH"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      defaultValue={p.supervisor2Assigned?.id ?? "none"}
                      onValueChange={(v) => { setSelection(p.id, "s2", v === "none" ? "" : (v ?? "")); }}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Pembimbing 2 (opsional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">– Tidak ada –</SelectItem>
                        {pembimbingList.map((pb) => (
                          <SelectItem
                            key={pb.id}
                            value={pb.id}
                            disabled={pb.bimbinganCount >= pb.maxBimbinganQuota}
                          >
                            {quotaLabel(pb)}
                            {pb.bimbinganCount >= pb.maxBimbinganQuota && " – PENUH"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleAssign(p.id)}
                    disabled={loading === p.id}
                    className="bg-[#C8102E] hover:bg-[#a50d26]"
                  >
                    <UserCheck className="mr-1 h-4 w-4" />
                    {loading === p.id ? "Menyimpan..." : "Tugaskan"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
