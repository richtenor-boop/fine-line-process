"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/rbac";
import { listRecentNotifications, markNotificationRead, markAllNotificationsRead } from "./service";

export async function fetchRecentNotificationsAction() {
  const session = await requireSession();
  return listRecentNotifications(session.user.organizationId, session.user.id);
}

export async function markNotificationReadAction(notificationId: string) {
  const session = await requireSession();
  await markNotificationRead(session.user.organizationId, session.user.id, notificationId);
  revalidatePath("/", "layout");
}

export async function markAllNotificationsReadAction() {
  const session = await requireSession();
  await markAllNotificationsRead(session.user.organizationId, session.user.id);
  revalidatePath("/", "layout");
}
