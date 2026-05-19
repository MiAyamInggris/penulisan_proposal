"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { checkAndUpdateDeReady } from "@/lib/actions/bimbingan";

export async function verifyEprt(eprtId: string) {
  const session = await auth();
  if (!session) return { error: "Tidak terautentikasi" };

  const eprt = await prisma.eprtRecord.update({
    where: { id: eprtId },
    data: {
      status: "VERIFIED",
      verifiedById: session.user.id,
      verifiedAt: new Date(),
    },
    include: {
      enrollment: { include: { proposal: { select: { id: true } } } },
    },
  });

  if (eprt.enrollment.proposal?.id) {
    await checkAndUpdateDeReady(eprt.enrollment.proposal.id);
  }

  revalidatePath("/dosen-kelas/eprt");
  revalidatePath("/dosen/kelas");
  revalidatePath("/mahasiswa/eprt");
  revalidatePath("/mahasiswa/dashboard");
  return { success: true };
}

export async function rejectEprt(eprtId: string) {
  await prisma.eprtRecord.delete({ where: { id: eprtId } });
  revalidatePath("/dosen-kelas/eprt");
  revalidatePath("/dosen/kelas");
  revalidatePath("/mahasiswa/eprt");
  revalidatePath("/mahasiswa/dashboard");
  return { success: true };
}
