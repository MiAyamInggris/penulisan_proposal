import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PresentasiScoreList } from "./presentasi-score-list";

export default async function PresentasiPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const proposals = await prisma.proposal.findMany({
    where: {
      OR: [
        { supervisor1AssignedId: session.user.id },
        { supervisor2AssignedId: session.user.id },
      ],
      status: { in: ["SEMINAR_SCHEDULED", "SEMINAR_COMPLETED", "COMPLETED"] },
    },
    include: {
      enrollment: {
        include: {
          student: { select: { name: true, identifier: true } },
          class: { select: { code: true } },
        },
      },
      seminar: {
        include: {
          nilaiPresentasi: {
            where: { pembimbingId: session.user.id },
          },
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nilai Presentasi Seminar (TA1-03)</h1>
        <p className="text-sm text-gray-500 mt-1">
          Berikan nilai presentasi setelah seminar proposal dilaksanakan
        </p>
      </div>
      <PresentasiScoreList proposals={proposals} />
    </div>
  );
}
