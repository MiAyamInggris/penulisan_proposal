import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { BimbinganLog } from "./bimbingan-log";

export default async function BimbinganPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const enrollment = await prisma.classEnrollment.findFirst({
    where: { studentId: session.user.id, isActive: true },
    include: {
      proposal: {
        include: {
          bimbinganSessions: { orderBy: { sessionNumber: "asc" } },
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Log Bimbingan</h1>
        <p className="text-sm text-gray-500 mt-1">
          Catat setiap sesi bimbingan dengan pembimbing Anda (minimal 3 sesi)
        </p>
      </div>

      {!enrollment?.proposal ? (
        <p className="text-gray-500">Daftarkan proposal terlebih dahulu sebelum mencatat bimbingan.</p>
      ) : (
        <BimbinganLog sessions={enrollment.proposal.bimbinganSessions} />
      )}
    </div>
  );
}
