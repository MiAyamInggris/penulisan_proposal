import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { StudentTabs } from "./student-tabs";

export default async function StudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ proposalId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { proposalId } = await params;
  const { tab } = await searchParams;

  const proposal = await prisma.proposal.findUnique({
    where: {
      id: proposalId,
      OR: [
        { supervisor1AssignedId: session.user.id },
        { supervisor2AssignedId: session.user.id },
      ],
    },
    include: {
      enrollment: {
        include: {
          student: { select: { name: true, identifier: true, email: true } },
          class: {
            include: { program: true },
          },
          eprt: { select: { status: true } },
        },
      },
      supervisor1Assigned: { select: { id: true, name: true } },
      supervisor2Assigned: { select: { id: true, name: true } },
      deskEvaluator: { select: { id: true, name: true } },
      bimbinganSessions: { orderBy: { sessionNumber: "asc" } },
      nilaiBimbingan: {
        where: { pembimbingId: session.user.id },
      },
      nilaiLiteratureReview: {
        where: { pembimbingId: session.user.id },
      },
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
      seminar: {
        include: {
          nilaiPresentasi: {
            where: { pembimbingId: session.user.id },
          },
        },
      },
      finalGrade: true,
    },
  });

  if (!proposal) notFound();

  const enrollmentRecord = await prisma.classEnrollment.findUnique({
    where: { id: proposal.enrollmentId },
    select: { studentId: true },
  });
  const studentId = enrollmentRecord?.studentId ?? "";

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <a href="/dosen/pembimbing" className="hover:text-[#C8102E]">
            Mahasiswa Bimbingan
          </a>
          <span>/</span>
          <span>{proposal.enrollment.student.name}</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          {proposal.enrollment.student.name}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {proposal.enrollment.student.identifier} ·{" "}
          {proposal.enrollment.class.code} ·{" "}
          {proposal.enrollment.class.program.code}
        </p>
      </div>

      <StudentTabs
        proposal={proposal}
        isSupervisor1={proposal.supervisor1AssignedId === session.user.id}
        activeTab={tab ?? "info"}
        studentId={studentId}
      />
    </div>
  );
}
