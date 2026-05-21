import { prisma } from "@/lib/prisma";

export async function getMyKK(userId: string) {
  return prisma.kelompokKeahlian.findUnique({
    where: { ketuaId: userId },
    select: { id: true, nama: true },
  });
}
