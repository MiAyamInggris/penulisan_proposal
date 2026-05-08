import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { LRScoreList } from "./lr-score-list";

export default async function LiteratureReviewPage() {
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
          class: { select: { code: true } },
        },
      },
      nilaiLiteratureReview: {
        where: { pembimbingId: session.user.id },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nilai Literature Review (TA1-05)</h1>
        <p className="text-sm text-gray-500 mt-1">
          Berikan nilai literature review untuk mahasiswa bimbingan Anda
        </p>
      </div>
      <LRScoreList proposals={proposals} />
    </div>
  );
}
