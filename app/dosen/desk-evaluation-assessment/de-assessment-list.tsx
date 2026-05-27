"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ClipboardEdit } from "lucide-react";

export type DEAssessmentRow = {
  id: string;
  titleId: string;
  enrollment: {
    student: { name: string; identifier: string };
    class: { code: string; deDeadline: Date | null };
  };
  deskEvaluation: { id: string } | null;
  isMengulang: boolean;
  semesterLabel: string;
};

export function DEAssessmentList({ proposals }: { proposals: DEAssessmentRow[] }) {
  if (proposals.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-dashed">
        <p className="text-gray-500">Belum ada proposal yang ditugaskan untuk semester ini.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {proposals.map((p) => (
        <Card key={p.id}>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                    {p.enrollment.class.code}
                  </span>
                  <span className="font-bold text-gray-900">{p.enrollment.student.name}</span>
                  <span className="text-sm text-gray-500">{p.enrollment.student.identifier}</span>
                  {p.isMengulang && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                      Mengulang
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 line-clamp-1">{p.titleId}</p>
                <div className="flex items-center gap-4 mt-2">
                  <div className="text-xs text-gray-500">
                    Deadline:{" "}
                    {p.enrollment.class.deDeadline
                      ? new Date(p.enrollment.class.deDeadline).toLocaleDateString("id-ID")
                      : "-"}
                  </div>
                  {p.deskEvaluation ? (
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">
                      Sudah Dinilai
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                      Belum Dinilai
                    </span>
                  )}
                </div>
              </div>

              <Link href={`/dosen/desk-evaluation-assessment/${p.id}`}>
                <Button className="w-full md:w-auto bg-[#C8102E] hover:bg-[#a50d26]">
                  <ClipboardEdit className="h-4 w-4 mr-2" />
                  {p.deskEvaluation ? "Edit Penilaian" : "Mulai Penilaian"}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
