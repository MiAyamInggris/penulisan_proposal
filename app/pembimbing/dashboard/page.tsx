import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import Link from "next/link";

export default async function PembimbingDashboard() {
  const session = await auth();
  if (!session) redirect("/login");

  const proposals = await prisma.proposal.findMany({
    where: {
      OR: [
        { supervisor1AssignedId: session.user.id },
        { supervisor2AssignedId: session.user.id },
      ],
    },
    include: {
      enrollment: {
        include: {
          student: { select: { name: true, identifier: true } },
          class: { select: { code: true, program: { select: { code: true } } } },
        },
      },
      bimbinganSessions: { select: { id: true } },
      finalGrade: { select: { weightedTotal: true, gradeIndex: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Pembimbing</h1>
        <p className="text-sm text-gray-500 mt-1">
          {proposals.length} mahasiswa bimbingan
        </p>
      </div>

      {proposals.length === 0 ? (
        <p className="text-gray-500">Belum ada mahasiswa yang ditugaskan kepada Anda.</p>
      ) : (
        <div className="grid gap-3">
          {proposals.map((p) => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                        {p.enrollment.class.code} ({p.enrollment.class.program.code})
                      </span>
                      <span className="font-semibold text-gray-900">
                        {p.enrollment.student.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {p.enrollment.student.identifier}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-1">{p.titleId}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>Bimbingan: {p.bimbinganSessions.length}/3</span>
                      <StatusBadge status={p.status} type="proposal" />
                      {p.supervisor1AssignedId === session.user.id ? (
                        <span className="text-blue-600">Pembimbing 1</span>
                      ) : (
                        <span className="text-purple-600">Pembimbing 2</span>
                      )}
                    </div>
                  </div>
                  {p.finalGrade?.weightedTotal !== null && p.finalGrade?.weightedTotal !== undefined && (
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-bold text-gray-900">{p.finalGrade.gradeIndex}</p>
                      <p className="text-xs text-gray-500">{p.finalGrade.weightedTotal.toFixed(1)}</p>
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
