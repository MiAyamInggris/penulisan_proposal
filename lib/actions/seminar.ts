"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createNotification } from "./notifications";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export async function scheduleSeminarWithNotification(
  proposalId: string,
  studentId: string,
  formData: FormData
) {
  const session = await auth();
  if (!session) return { error: "Tidak terautentikasi" };

  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    select: {
      supervisor1AssignedId: true,
      supervisor2AssignedId: true,
      status: true,
    },
  });

  if (!proposal) return { error: "Proposal tidak ditemukan" };

  const isPembimbing =
    proposal.supervisor1AssignedId === session.user.id ||
    proposal.supervisor2AssignedId === session.user.id;

  if (!isPembimbing) {
    return { error: "Hanya pembimbing yang dapat menjadwalkan seminar" };
  }

  const scheduledDate = new Date(formData.get("scheduledDate") as string);
  const location = (formData.get("location") as string) || null;

  await prisma.$transaction([
    prisma.seminar.upsert({
      where: { proposalId },
      update: { scheduledDate, location, status: "SCHEDULED" },
      create: { proposalId, scheduledDate, location, status: "SCHEDULED" },
    }),
  ]);

  const dateStr = format(scheduledDate, "dd MMMM yyyy 'pukul' HH:mm", {
    locale: idLocale,
  });
  const locationStr = location ? ` di ${location}` : "";

  await createNotification(
    studentId,
    "ASSIGNMENT_MADE",
    "Jadwal Seminar Ditetapkan",
    `Seminar Anda telah dijadwalkan pada ${dateStr}${locationStr}.`,
    proposalId
  );

  revalidatePath("/pembimbing/seminar");
  revalidatePath(`/dosen/pembimbing/${proposalId}`);
  return { success: true };
}
