import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { ClassTabs } from "./class-tabs";

export default async function ClassDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { classId } = await params;
  const { tab } = await searchParams;

  const cls = await prisma.class.findUnique({
    where: { id: classId, dosenKelasId: session.user.id },
    include: {
      program: true,
      enrollments: {
        where: { isActive: true },
        orderBy: { enrolledAt: "asc" },
        include: {
          student: { select: { id: true, name: true, identifier: true } },
          proposal: {
            include: {
              supervisor1Requested: { select: { id: true, name: true } },
              supervisor2Requested: { select: { id: true, name: true } },
              supervisor1Assigned: { select: { id: true, name: true } },
              supervisor2Assigned: { select: { id: true, name: true } },
              deskEvaluator: { select: { id: true, name: true } },
              bimbinganSessions: { select: { id: true } },
              deskEvaluation: {
                select: {
                  latarBelakang: true,
                  formulasiMasalah: true,
                  teoriPendukung: true,
                  ideMetode: true,
                  isLate: true,
                  catatanReviewer: true,
                },
              },
              seminar: { select: { status: true, scheduledDate: true } },
              finalGrade: {
                select: { weightedTotal: true, gradeIndex: true },
              },
            },
          },
          eprt: true,
        },
      },
    },
  });

  if (!cls) notFound();

  const pembimbingList = await prisma.user.findMany({
    where: { role: "DOSEN", isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <a href="/dosen/kelas" className="hover:text-[#C8102E]">
            Kelas Saya
          </a>
          <span>/</span>
          <span>{cls.code}</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          {cls.code} – {cls.name}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {cls.program.code} · {cls.semester} {cls.academicYear} ·{" "}
          {cls.enrollments.length} mahasiswa
        </p>
      </div>

      <ClassTabs cls={cls} pembimbingList={pembimbingList} activeTab={tab ?? "mahasiswa"} />
    </div>
  );
}
