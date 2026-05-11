import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { DEAssessmentList } from "./de-assessment-list";

export default async function DEAssessmentPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const proposals = await prisma.proposal.findMany({
    where: {
      deskEvaluatorId: session.user.id,
    },
    include: {
      enrollment: {
        include: {
          student: { select: { name: true, identifier: true } },
          class: { select: { code: true, deDeadline: true } },
        },
      },
      deskEvaluation: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Desk Evaluation Assessment</h1>
        <p className="text-sm text-gray-500 mt-1">
          Daftar proposal mahasiswa yang ditugaskan kepada Anda untuk dinilai
        </p>
      </div>
      <DEAssessmentList proposals={proposals} />
    </div>
  );
}
