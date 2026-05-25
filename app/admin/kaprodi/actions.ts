"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";

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

    // Get dosen name for audit
    const dosen = await prisma.user.findUnique({ where: { id: dosenId }, select: { name: true } });
    const program = await prisma.program.findUnique({ where: { id: programId }, select: { code: true } });
    await logAudit(session.user.id, "ADMIN", "ASSIGN_KAPRODI", {
      dosenId, dosenName: dosen?.name, programId, prodiCode: program?.code,
    }, "PROGRAM", programId);

    revalidatePath("/admin/kaprodi");
    revalidatePath("/admin/audit-log");
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

    const prog = await prisma.program.findUnique({ where: { id: programId }, select: { code: true } });
    await logAudit(session.user.id, "ADMIN", "REMOVE_KAPRODI", {
      programId, prodiCode: prog?.code, removedDosenId: program?.kaprodiId,
    }, "PROGRAM", programId);

    revalidatePath("/admin/kaprodi");
    revalidatePath("/admin/audit-log");
    return { success: true };
  } catch (err) {
    return { error: String(err) };
  }
}
