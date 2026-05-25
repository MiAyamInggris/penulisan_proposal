"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function assignKaprodi(dosenId: string, programId: string): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { error: "Unauthorized" };

  try {
    // Clear any existing kaprodi for this program
    await prisma.program.updateMany({
      where: { kaprodiId: dosenId },
      data: { kaprodiId: null },
    });
    await prisma.user.updateMany({
      where: { isKaprodi: true, kaprodiDiProdi: { id: programId } },
      data: { isKaprodi: false },
    });

    // Assign new kaprodi
    await prisma.program.update({
      where: { id: programId },
      data: { kaprodiId: dosenId },
    });
    await prisma.user.update({
      where: { id: dosenId },
      data: { isKaprodi: true },
    });

    revalidatePath("/admin/kaprodi");
    return { success: true };
  } catch (err) {
    return { error: String(err) };
  }
}

export async function removeKaprodi(programId: string): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { error: "Unauthorized" };

  try {
    const program = await prisma.program.findUnique({
      where: { id: programId },
      select: { kaprodiId: true },
    });

    if (program?.kaprodiId) {
      await prisma.user.update({
        where: { id: program.kaprodiId },
        data: { isKaprodi: false },
      });
    }

    await prisma.program.update({
      where: { id: programId },
      data: { kaprodiId: null },
    });

    revalidatePath("/admin/kaprodi");
    return { success: true };
  } catch (err) {
    return { error: String(err) };
  }
}
