"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { assignDeskEvaluator } from "./actions";
import { ClipboardList } from "lucide-react";

type Proposal = {
  id: string;
  titleId: string;
  enrollment: {
    student: { name: string; identifier: string };
    class: { code: string };
  };
  supervisor1Assigned: { id: string; name: string } | null;
  supervisor2Assigned: { id: string; name: string } | null;
  deskEvaluator: { id: string; name: string } | null;
};

type Pembimbing = { id: string; name: string };

export function DEAssignList({
  proposals,
  pembimbingList,
}: {
  proposals: Proposal[];
  pembimbingList: Pembimbing[];
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});

  const getSelection = (proposalId: string) =>
    selections[proposalId] ?? "";

  const setSelection = (proposalId: string, value: string) =>
    setSelections((prev) => ({ ...prev, [proposalId]: value }));

  const handleAssign = async (proposalId: string) => {
    const selected = getSelection(proposalId);
    if (!selected || selected === "none") {
      toast.error("Pilih desk evaluator terlebih dahulu");
      return;
    }
    setLoading(proposalId);
    try {
      const result = await assignDeskEvaluator(proposalId, selected);
      if ("error" in result) toast.error(String(result.error));
      else {
        toast.success("Desk evaluator berhasil ditugaskan");
        // Clear local selection to let the prop take over
        setSelection(proposalId, "");
      }
    } finally {
      setLoading(null);
    }
  };

  const handleUnassign = async (proposalId: string) => {
    setLoading(proposalId);
    try {
      const result = await assignDeskEvaluator(proposalId, null);
      if ("error" in result) toast.error(String(result.error));
      else {
        setSelection(proposalId, "none");
        toast.success("Penugasan desk evaluator dihapus");
      }
    } finally {
      setLoading(null);
    }
  };

  if (proposals.length === 0) {
    return (
      <p className="text-gray-500">Belum ada proposal di kelas Anda.</p>
    );
  }

  return (
    <div className="space-y-3">
      {proposals.map((p) => {
        const blockedIds = new Set([
          p.supervisor1Assigned?.id,
          p.supervisor2Assigned?.id,
        ].filter(Boolean) as string[]);

        const availablePembimbing = pembimbingList.filter(
          (pb) => !blockedIds.has(pb.id)
        );

        const currentEval = p.deskEvaluator;

        return (
          <Card key={p.id}>
            <CardContent className="pt-4 space-y-3">
              {/* Header */}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                    {p.enrollment.class.code}
                  </span>
                  <span className="font-medium text-gray-900">
                    {p.enrollment.student.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {p.enrollment.student.identifier}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                  {p.titleId}
                </p>
              </div>

              {/* Supervisor info */}
              <div className="text-xs text-gray-500 space-y-0.5">
                <p className="font-medium text-gray-600">Pembimbing (tidak boleh dipilih):</p>
                <p>
                  Pembimbing 1:{" "}
                  <span className="text-gray-700">
                    {p.supervisor1Assigned?.name ?? "–"}
                  </span>
                </p>
                <p>
                  Pembimbing 2:{" "}
                  <span className="text-gray-700">
                    {p.supervisor2Assigned?.name ?? "–"}
                  </span>
                </p>
              </div>

              {/* Current evaluator */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Desk Evaluator saat ini:</span>
                {currentEval ? (
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                    {currentEval.name}
                  </Badge>
                ) : (
                  <span className="text-sm text-gray-400 italic">Belum ditugaskan</span>
                )}
              </div>

              {/* Assign controls */}
              <div className="flex items-center gap-2">
                <Select
                  key={currentEval?.id ?? "none"}
                  value={selections[p.id] || currentEval?.id || "none"}
                  onValueChange={(v) => v && setSelection(p.id, v)}
                >
                  <SelectTrigger className="h-8 text-sm flex-1">
                    <SelectValue placeholder="Pilih Desk Evaluator" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">– Pilih evaluator –</SelectItem>
                    {availablePembimbing.length === 0 ? (
                      <SelectItem value="__empty__" disabled>
                        Semua dosen sudah jadi pembimbing
                      </SelectItem>
                    ) : (
                      availablePembimbing.map((pb) => (
                        <SelectItem key={pb.id} value={pb.id}>
                          {pb.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>

                <Button
                  size="sm"
                  onClick={() => handleAssign(p.id)}
                  disabled={loading === p.id}
                  className="bg-[#C8102E] hover:bg-[#a50d26] shrink-0"
                >
                  <ClipboardList className="mr-1 h-4 w-4" />
                  {loading === p.id ? "Menyimpan..." : "Tugaskan"}
                </Button>

                {currentEval && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUnassign(p.id)}
                    disabled={loading === p.id}
                    className="shrink-0 text-red-600 border-red-200 hover:bg-red-50"
                  >
                    Hapus
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
