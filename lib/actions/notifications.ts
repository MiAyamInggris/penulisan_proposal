"use server";

import { prisma } from "@/lib/prisma";
import { NotificationType } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function createNotification(
  recipientId: string,
  type: NotificationType,
  title: string,
  message: string,
  proposalId?: string
) {
  await prisma.notification.create({
    data: { recipientId, type, title, message, proposalId },
  });
}

export async function markNotificationRead(notificationId: string) {
  await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
  revalidatePath("/");
  return { success: true };
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { recipientId: userId, isRead: false },
    data: { isRead: true },
  });
  revalidatePath("/");
  return { success: true };
}

export async function getMyNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { recipientId: userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}
