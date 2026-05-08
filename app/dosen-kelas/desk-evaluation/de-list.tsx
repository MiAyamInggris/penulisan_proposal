"use client";

import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";

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
};

export function DEList({ proposals }: { proposals: Proposal[] }) {
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
              <div className="flex items-start justify-between gap-4">
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
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
