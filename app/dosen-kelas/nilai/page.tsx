import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default async function NilaiRekapPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const classes = await prisma.class.findMany({
    where: { dosenKelasId: session.user.id },
    orderBy: [{ academicYear: "desc" }, { code: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      semester: true,
      academicYear: true,
      program: { select: { code: true } },
      enrollments: {
        where: { isActive: true },
        select: {
          proposal: {
            select: {
              status: true,
              finalGrade: { select: { passed: true, weightedTotal: true } },
            },
          },
        },
      },
    },
  });

  const classRows = classes.map((c) => {
    const total = c.enrollments.length;
    let lulus = 0;
    let tidakLulus = 0;
    let seminarProgress = 0;

    for (const e of c.enrollments) {
      const fg = e.proposal?.finalGrade;
      const status = e.proposal?.status;

      if (fg?.weightedTotal !== null && fg?.weightedTotal !== undefined) {
        if (fg.passed) lulus++;
        else tidakLulus++;
      }

      if (
        status &&
        ["SEMINAR_REGISTERED", "SEMINAR_COMPLETED", "COMPLETED"].includes(status)
      ) {
        seminarProgress++;
      }
    }

    const graded = lulus + tidakLulus;
    return {
      id: c.id,
      code: c.code,
      name: c.name,
      semester: c.semester,
      academicYear: c.academicYear,
      prodi: c.program.code,
      total,
      lulus,
      tidakLulus,
      seminarProgress,
      pct: graded > 0 ? (lulus / graded) * 100 : null,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rekap Nilai</h1>
        <p className="text-sm text-gray-500 mt-1">
          Pilih kelas untuk melihat rekap nilai mahasiswa
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Kelas</CardTitle>
        </CardHeader>
        <CardContent>
          {classRows.length === 0 ? (
            <p className="text-sm text-gray-500">Belum ada kelas yang Anda ampu.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-2 pr-4 font-medium">Kelas</th>
                    <th className="py-2 pr-4 font-medium">Semester / TA</th>
                    <th className="py-2 pr-4 font-medium text-right">Total</th>
                    <th className="py-2 pr-4 font-medium text-right">Lulus</th>
                    <th className="py-2 pr-4 font-medium text-right">Tdk Lulus</th>
                    <th className="py-2 pr-4 font-medium text-right">Seminar</th>
                    <th className="py-2 pr-4 font-medium text-right">% Lulus</th>
                    <th className="py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {classRows.map((c) => (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50 group">
                      <td className="py-2.5 pr-4">
                        <span className="font-medium">{c.code}</span>
                        {c.name && (
                          <span className="ml-2 text-xs text-gray-400">{c.name}</span>
                        )}
                        <span className="ml-2 text-xs text-gray-400">({c.prodi})</span>
                      </td>
                      <td className="py-2.5 pr-4 text-gray-500">
                        {c.semester} / {c.academicYear}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-semibold">{c.total}</td>
                      <td className="py-2.5 pr-4 text-right text-green-700 font-semibold">
                        {c.lulus}
                      </td>
                      <td className="py-2.5 pr-4 text-right text-red-700 font-semibold">
                        {c.tidakLulus}
                      </td>
                      <td className="py-2.5 pr-4 text-right text-blue-600">
                        {c.seminarProgress > 0 ? (
                          c.seminarProgress
                        ) : (
                          <span className="text-gray-400">–</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-right">
                        {c.pct !== null ? (
                          <Badge
                            className={
                              c.pct >= 75
                                ? "bg-green-100 text-green-800 hover:bg-green-100"
                                : c.pct >= 50
                                ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                                : "bg-red-100 text-red-800 hover:bg-red-100"
                            }
                          >
                            {c.pct.toFixed(1)}%
                          </Badge>
                        ) : (
                          <span className="text-gray-400">–</span>
                        )}
                      </td>
                      <td className="py-2.5">
                        <Link
                          href={`/dosen-kelas/nilai/${c.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#C8102E] hover:text-[#a00d24] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
                        >
                          Lihat Rekap
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
