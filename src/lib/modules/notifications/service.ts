import "server-only";
import { prisma } from "@/lib/db";

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
}

export async function createNotification(organizationId: string, input: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      organizationId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
    },
  });
}

export async function listRecentNotifications(organizationId: string, userId: string, limit = 10) {
  return prisma.notification.findMany({
    where: { organizationId, userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function countUnreadNotifications(organizationId: string, userId: string) {
  return prisma.notification.count({ where: { organizationId, userId, readAt: null } });
}

export async function markNotificationRead(organizationId: string, userId: string, notificationId: string) {
  await prisma.notification.updateMany({
    where: { id: notificationId, organizationId, userId },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsRead(organizationId: string, userId: string) {
  await prisma.notification.updateMany({
    where: { organizationId, userId, readAt: null },
    data: { readAt: new Date() },
  });
}
