import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { BimbinganScoreList } from "./bimbingan-score-list";

export default async function NilaiBimbinganPage() {
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
      bimbinganSessions: { orderBy: { sessionNumber: "asc" } },
      nilaiBimbingan: {
        where: { pembimbingId: session.user.id },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nilai Bimbingan (TA1-01B)</h1>
        <p className="text-sm text-gray-500 mt-1">
          Berikan nilai bimbingan untuk setiap mahasiswa bimbingan Anda
        </p>
      </div>
      <BimbinganScoreList proposals={proposals} />
    </div>
  );
}
