import { prisma } from "./prisma";

export async function getMyProdi(userId: string) {
  return prisma.program.findFirst({
    where: { kaprodiId: userId },
    select: { id: true, name: true, code: true },
  });
}
