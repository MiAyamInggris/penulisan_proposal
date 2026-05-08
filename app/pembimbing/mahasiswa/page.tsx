import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export default async function MahasiswaListPage() {
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
      bimbinganSessions: { orderBy: { sessionNumber: "desc" }, take: 1 },
      finalGrade: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Daftar Mahasiswa Bimbingan</h1>
        <p className="text-sm text-gray-500 mt-1">{proposals.length} mahasiswa</p>
      </div>

      {proposals.length === 0 ? (
        <p className="text-gray-500">Belum ada mahasiswa yang ditugaskan.</p>
      ) : (
        <div className="space-y-3">
          {proposals.map((p) => (
            <Card key={p.id}>
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
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
                    <p className="text-sm text-gray-600 mt-1">{p.titleId}</p>
                  </div>
                  <StatusBadge status={p.status} type="proposal" />
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                  <span>
                    {p.supervisor1AssignedId === session.user.id
                      ? "Pembimbing 1"
                      : "Pembimbing 2"}
                  </span>
                  <span>Bimbingan: {p.bimbinganSessions.length > 0 ? `Sesi ${p.bimbinganSessions[0].sessionNumber}` : "Belum ada"}</span>
                  {p.finalGrade?.gradeIndex ? (
                    <span className="font-bold text-gray-900">Nilai: {p.finalGrade.gradeIndex} ({p.finalGrade.weightedTotal?.toFixed(1)})</span>
                  ) : <span>–</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
