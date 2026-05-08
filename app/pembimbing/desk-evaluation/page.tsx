import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { DEList } from "./de-list";

export default async function PembimbingDeskEvaluationPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const proposals = await prisma.proposal.findMany({
    where: {
      deskEvaluatorId: session.user.id,
      status: {
        in: [
          "DE_SUBMITTED",
          "DE_SCORED",
          "DE_REVISED",
          "SEMINAR_SCHEDULED",
          "SEMINAR_COMPLETED",
          "COMPLETED",
        ],
      },
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
    orderBy: { updatedAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Desk Evaluation</h1>
        <p className="text-sm text-gray-500 mt-1">
          Beri nilai proposal mahasiswa yang ditugaskan kepada Anda sebagai Desk Evaluator
        </p>
      </div>
      <DEList proposals={proposals} />
    </div>
  );
}
