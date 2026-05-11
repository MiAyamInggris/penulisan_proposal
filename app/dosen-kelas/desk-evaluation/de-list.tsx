"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { UserCheck } from "lucide-react";
import { assignDeskEvaluator } from "./actions";
import { toast } from "sonner";

type Proposal = {
  id: string;
  titleId: string;
  status: string;
  enrollment: {
    student: { name: string; identifier: string };
    class: { code: string; deDeadline: Date | null };
  };
  deskEvaluation: {
    latarBelakang: number;
    formulasiMasalah: number;
    teoriPendukung: number;
    ideMetode: number;
    isLate: boolean;
    catatanReviewer: string | null;
  } | null;
  deskEvaluator: { id: string; name: string } | null;
};

type Lecturer = { id: string; name: string };

export function DEList({ 
  proposals,
  lecturers,
}: { 
  proposals: Proposal[];
  lecturers: Lecturer[];
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<string, string | null>>({});

  const handleAssign = async (proposalId: string) => {
    const evaluatorId = selections[proposalId];
    if (!evaluatorId) {
      toast.error("Pilih Desk Evaluator terlebih dahulu");
      return;
    }

    setLoading(proposalId);
    try {
      await assignDeskEvaluator(proposalId, evaluatorId);
      toast.success("Desk Evaluator berhasil ditugaskan");
    } catch (error) {
      toast.error("Gagal menugaskan Desk Evaluator");
    } finally {
      setLoading(null);
    }
  };

  if (proposals.length === 0) {
    return <p className="text-gray-500">Belum ada proposal yang dikumpulkan untuk DE.</p>;
  }

  return (
    <div className="space-y-3">
      {proposals.map((p) => {
        const de = p.deskEvaluation;
        const rawTotal = de
          ? de.latarBelakang + de.formulasiMasalah + de.teoriPendukung + de.ideMetode
          : null;
        const finalScore = de ? (de.isLate ? Math.min(rawTotal!, 51) : rawTotal!) : null;

        return (
          <Card key={p.id}>
            <CardContent className="pt-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{p.enrollment.class.code}</span>
                    <span className="font-medium text-gray-900">{p.enrollment.student.name}</span>
                    <span className="text-xs text-gray-500">{p.enrollment.student.identifier}</span>
                    <StatusBadge status={p.status} type="proposal" />
                    {de?.isLate && (
                      <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded">Terlambat</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-1">{p.titleId}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {de && (
                      <p className="text-sm">
                        Nilai DE:{" "}
                        <span className="font-bold text-gray-900">
                          {finalScore?.toFixed(1)}
                        </span>
                        {de.isLate && rawTotal! > 51 && (
                          <span className="text-xs text-red-500 ml-1">(raw: {rawTotal?.toFixed(1)})</span>
                        )}
                      </p>
                    )}
                    <p className="text-sm">
                      Evaluator: <span className="font-medium text-blue-600">{p.deskEvaluator?.name || "Belum ditugaskan"}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Select
                    defaultValue={p.deskEvaluator?.id}
                    onValueChange={(v) => setSelections((prev) => ({ ...prev, [p.id]: v }))}
                  >
                    <SelectTrigger className="w-[200px] h-9 text-sm">
                      <SelectValue placeholder="Pilih Evaluator" />
                    </SelectTrigger>
                    <SelectContent>
                      {lecturers.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    className="h-9"
                    disabled={loading === p.id}
                    onClick={() => handleAssign(p.id)}
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    {loading === p.id ? "..." : "Tugaskan"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
