"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGlobalQuota } from "@/lib/settings";

export type DosenWorkloadDetail = {
  globalQuota: number;
  historicalCount: number;
  activeCount: number;
  pengujiCount: number;
};

export async function getDosenWorkloadDetail(userId: string): Promise<DosenWorkloadDetail> {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") throw new Error("Tidak terautentikasi");

  const [sv1, sv2, penguji1Count, penguji2Count, globalQuota] = await Promise.all([
    prisma.proposal.findMany({
      where: { supervisor1AssignedId: userId, status: { notIn: ["ENROLLED", "PROPOSAL_UPLOADED"] } },
      select: { status: true },
    }),
    prisma.proposal.findMany({
      where: { supervisor2AssignedId: userId, status: { notIn: ["ENROLLED", "PROPOSAL_UPLOADED"] } },
      select: { status: true },
    }),
    prisma.sidangRecord.count({ where: { penguji1Id: userId } }),
    prisma.sidangRecord.count({ where: { penguji2Id: userId } }),
    getGlobalQuota(),
  ]);

  const all = [...sv1, ...sv2];
  const historicalCount = all.filter((p) => p.status === "COMPLETED").length;
  const activeCount = all.filter((p) => p.status !== "COMPLETED" && p.status !== "LULUS").length;

  return {
    globalQuota,
    historicalCount,
    activeCount,
    pengujiCount: penguji1Count + penguji2Count,
  };
}
