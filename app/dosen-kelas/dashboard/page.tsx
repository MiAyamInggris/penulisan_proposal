import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";

export default async function DosenKelasDashboard() {
  const session = await auth();
  if (!session) redirect("/login");

  const myClasses = await prisma.class.findMany({
    where: { dosenKelasId: session.user.id },
    include: {
      program: true,
      enrollments: {
        where: { isActive: true },
        include: {
          proposal: { select: { status: true } },
          eprt: { select: { status: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Dosen Kelas</h1>
        <p className="text-sm text-gray-500 mt-1">
          Kelas yang Anda ampu
        </p>
      </div>

      {myClasses.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-500 text-center py-8">
              Anda belum ditugaskan sebagai Dosen Kelas di kelas manapun.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {myClasses.map((cls) => {
            const enrollments = cls.enrollments;
            const total = enrollments.length;
            const statusCounts: Record<string, number> = {};
            enrollments.forEach((e) => {
              const s = e.proposal?.status ?? "ENROLLED";
              statusCounts[s] = (statusCounts[s] ?? 0) + 1;
            });
            const completed = statusCounts["COMPLETED"] ?? 0;
            const pendingEprt = enrollments.filter(
              (e) => !e.eprt || e.eprt.status === "PENDING"
            ).length;

            return (
              <Card key={cls.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div>
                      <span className="text-lg">{cls.code}</span>
                      <span className="ml-2 text-sm font-normal text-gray-500">
                        {cls.name}
                      </span>
                    </div>
                    <span className="text-sm font-normal bg-gray-100 px-2 py-1 rounded">
                      {cls.program.code} | {cls.semester} {cls.academicYear}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-gray-900">{total}</p>
                      <p className="text-xs text-gray-500">Total Mahasiswa</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-700">{completed}</p>
                      <p className="text-xs text-gray-500">Selesai</p>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <p className="text-2xl font-bold text-yellow-700">{pendingEprt}</p>
                      <p className="text-xs text-gray-500">EpRT Pending</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Status Mahasiswa</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(statusCounts).map(([status, count]) => (
                        <div key={status} className="flex items-center gap-1">
                          <StatusBadge status={status} type="proposal" />
                          <span className="text-xs text-gray-600">({count})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
