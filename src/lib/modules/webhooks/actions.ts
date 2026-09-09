"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { createWebhook, deleteWebhook, toggleWebhookActive } from "./service";
import { createWebhookSchema } from "./schema";

export interface CreateWebhookState {
  error?: string;
}

export async function createWebhookAction(_prevState: CreateWebhookState, formData: FormData): Promise<CreateWebhookState> {
  const session = await requirePermission("webhooks:manage");

  const parsed = createWebhookSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  await createWebhook(session.user.organizationId, parsed.data);
  revalidatePath("/settings/webhooks");
  return {};
}

export async function toggleWebhookAction(formData: FormData): Promise<void> {
  const session = await requirePermission("webhooks:manage");
  const webhookId = String(formData.get("webhookId"));
  const isActive = formData.get("isActive") === "true";

  await toggleWebhookActive(session.user.organizationId, webhookId, isActive);
  revalidatePath("/settings/webhooks");
}

export async function deleteWebhookAction(formData: FormData): Promise<void> {
  const session = await requirePermission("webhooks:manage");
  const webhookId = String(formData.get("webhookId"));

  await deleteWebhook(session.user.organizationId, webhookId);
  revalidatePath("/settings/webhooks");
}
