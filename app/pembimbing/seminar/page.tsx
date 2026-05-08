import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SeminarScheduleList } from "./seminar-schedule-list";

export default async function SeminarPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const proposals = await prisma.proposal.findMany({
    where: {
      supervisor1AssignedId: session.user.id,
      status: { in: ["DE_REVISED", "SEMINAR_SCHEDULED", "SEMINAR_COMPLETED"] },
    },
    include: {
      enrollment: {
        include: {
          student: { select: { name: true, identifier: true } },
          class: { select: { code: true } },
        },
      },
      seminar: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Jadwal Seminar Proposal</h1>
        <p className="text-sm text-gray-500 mt-1">
          Jadwalkan seminar proposal untuk mahasiswa bimbingan Anda (hanya Pembimbing 1)
        </p>
      </div>
      <SeminarScheduleList proposals={proposals} />
    </div>
  );
}
