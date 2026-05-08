"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function verifyEprt(eprtId: string) {
  const session = await auth();
  if (!session) return { error: "Tidak terautentikasi" };

  await prisma.eprtRecord.update({
    where: { id: eprtId },
    data: {
      status: "VERIFIED",
      verifiedById: session.user.id,
      verifiedAt: new Date(),
    },
  });

  revalidatePath("/dosen-kelas/eprt");
  return { success: true };
}

export async function rejectEprt(eprtId: string) {
  await prisma.eprtRecord.delete({ where: { id: eprtId } });
  revalidatePath("/dosen-kelas/eprt");
  return { success: true };
}
