import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { DEList } from "./de-list";

export default async function DeskEvaluationPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const myClassIds = (
    await prisma.class.findMany({
      where: { dosenKelasId: session.user.id },
      select: { id: true },
    })
  ).map((c) => c.id);

  const proposals = await prisma.proposal.findMany({
    where: {
      enrollment: { classId: { in: myClassIds } },
      status: { in: ["DE_READY", "DE_COMPLETED", "REVISION_UPLOADED", "SEMINAR_REGISTERED", "SEMINAR_COMPLETED", "COMPLETED"] },
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
        <h1 className="text-2xl font-bold text-gray-900">Desk Evaluation (TA1-02)</h1>
        <p className="text-sm text-gray-500 mt-1">
          Nilai proposal mahasiswa yang sudah dikumpulkan
        </p>
      </div>
      <DEList proposals={proposals} />
    </div>
  );
}
