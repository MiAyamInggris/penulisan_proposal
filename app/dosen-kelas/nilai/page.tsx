import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RekapTable } from "./rekap-table";

export default async function NilaiRekapPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const myClassIds = (
    await prisma.class.findMany({
      where: { dosenKelasId: session.user.id },
      select: { id: true },
    })
  ).map((c) => c.id);

  const enrollments = await prisma.classEnrollment.findMany({
    where: { classId: { in: myClassIds }, isActive: true },
    include: {
      student: { select: { name: true, identifier: true } },
      class: { select: { code: true, program: { select: { code: true } } } },
      proposal: {
        include: {
          finalGrade: true,
          deskEvaluation: { select: { isLate: true } },
        },
      },
    },
    orderBy: [{ class: { code: "asc" } }, { student: { name: "asc" } }],
  });

  const rows = enrollments.map((e) => ({
    id: e.id,
    nim: e.student.identifier,
    name: e.student.name,
    kelas: e.class.code,
    prodi: e.class.program.code,
    lrScore: e.proposal?.finalGrade?.lrScore ?? null,
    bimbinganScore: e.proposal?.finalGrade?.bimbinganScore ?? null,
    deScore: e.proposal?.finalGrade?.deScore ?? null,
    presentasiScore: e.proposal?.finalGrade?.presentasiScore ?? null,
    weightedTotal: e.proposal?.finalGrade?.weightedTotal ?? null,
    gradeIndex: e.proposal?.finalGrade?.gradeIndex ?? null,
    passed: e.proposal?.finalGrade?.passed ?? null,
    isLate: e.proposal?.deskEvaluation?.isLate ?? false,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rekap Nilai</h1>
        <p className="text-sm text-gray-500 mt-1">
          Nilai akhir seluruh mahasiswa di kelas Anda
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Tabel Rekap Nilai</CardTitle>
        </CardHeader>
        <CardContent>
          <RekapTable rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
