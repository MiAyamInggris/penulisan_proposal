import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ProposalForm } from "./proposal-form";
import { ProposalDetail } from "./proposal-detail";

export default async function ProposalPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const enrollment = await prisma.classEnrollment.findFirst({
    where: { studentId: session.user.id, isActive: true },
    include: {
      proposal: {
        include: {
          supervisor1Requested: { select: { id: true, name: true } },
          supervisor2Requested: { select: { id: true, name: true } },
          supervisor1Assigned: { select: { id: true, name: true } },
          supervisor2Assigned: { select: { id: true, name: true } },
          bimbinganSessions: true,
        },
      },
      eprt: true,
      class: { include: { program: true } },
    },
  });

  const pembimbingList = await prisma.user.findMany({
    where: { role: "DOSEN", isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, identifier: true },
  });

  if (!enrollment) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Proposal Saya</h1>
        <p className="text-gray-500">Anda belum terdaftar di kelas manapun.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Proposal Saya</h1>
        <p className="text-sm text-gray-500 mt-1">
          {enrollment.class.code} – {enrollment.class.program.code}
        </p>
      </div>

      {!enrollment.proposal ? (
        <ProposalForm pembimbingList={pembimbingList} />
      ) : (
        <ProposalDetail
          proposal={enrollment.proposal}
          eprt={enrollment.eprt}
        />
      )}
    </div>
  );
}
