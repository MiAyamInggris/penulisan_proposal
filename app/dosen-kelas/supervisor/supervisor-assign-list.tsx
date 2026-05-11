"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { assignSupervisors } from "./actions";
import { UserCheck, Download } from "lucide-react";

type Proposal = {
  id: string;
  titleId: string;
  proposalUrl: string | null;
  enrollment: {
    student: { name: string; identifier: string };
    class: { code: string };
  };
  supervisor1Requested: { id: string; name: string } | null;
  supervisor2Requested: { id: string; name: string } | null;
  supervisor1Assigned: { id: string; name: string } | null;
  supervisor2Assigned: { id: string; name: string } | null;
};

type Pembimbing = { id: string; name: string };

export function SupervisorAssignList({
  proposals,
  pembimbingList,
}: {
  proposals: Proposal[];
  pembimbingList: Pembimbing[];
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
      await assignSupervisors(proposalId, s1, s2 || null);
      toast.success("Pembimbing berhasil ditugaskan");
    } finally {
      setLoading(null);
    }
  };

  if (proposals.length === 0) {
    return <p className="text-gray-500">Belum ada proposal di kelas Anda.</p>;
  }

  return (
    <div className="space-y-3">
      {proposals.map((p) => (
        <Card key={p.id}>
          <CardContent className="pt-4 space-y-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{p.enrollment.class.code}</span>
                <span className="font-medium text-gray-900">{p.enrollment.student.name}</span>
                <span className="text-xs text-gray-500">{p.enrollment.student.identifier}</span>
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
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
              <div>
                <p className="font-medium mb-0.5">Usulan Mahasiswa</p>
                <p>Pembimbing 1: {p.supervisor1Requested?.name ?? "–"}</p>
                <p>Pembimbing 2: {p.supervisor2Requested?.name ?? "–"}</p>
              </div>
              <div>
                <p className="font-medium mb-0.5 text-green-700">Penugasan (Rapat Pleno)</p>
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
                    <SelectItem key={pb.id} value={pb.id}>{pb.name}</SelectItem>
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
                    <SelectItem key={pb.id} value={pb.id}>{pb.name}</SelectItem>
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
      ))}
    </div>
  );
}
