import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SupervisorAssignList } from "./supervisor-assign-list";

export default async function SupervisorPage() {
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
    },
    include: {
      enrollment: {
        include: {
          student: { select: { name: true, identifier: true } },
          class: { select: { code: true } },
        },
      },
      supervisor1Requested: { select: { id: true, name: true } },
      supervisor2Requested: { select: { id: true, name: true } },
      supervisor1Assigned: { select: { id: true, name: true } },
      supervisor2Assigned: { select: { id: true, name: true } },
    },
  });

  const pembimbingList = await prisma.user.findMany({
    where: { roles: { has: "PEMBIMBING" } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Penugasan Pembimbing</h1>
        <p className="text-sm text-gray-500 mt-1">
          Tugaskan pembimbing berdasarkan hasil Rapat Pleno
        </p>
      </div>
      <SupervisorAssignList proposals={proposals} pembimbingList={pembimbingList} />
    </div>
  );
}
