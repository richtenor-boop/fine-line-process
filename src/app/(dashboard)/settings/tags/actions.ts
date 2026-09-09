"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { findOrCreateTag, deleteTag } from "@/lib/modules/tags/service";
import { createTagSchema } from "@/lib/modules/tags/schema";

export interface CreateTagState {
  error?: string;
}

export async function createTagAction(_prevState: CreateTagState, formData: FormData): Promise<CreateTagState> {
  const session = await requirePermission("organization:manage");

  const parsed = createTagSchema.safeParse({ name: formData.get("name"), color: formData.get("color") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  await findOrCreateTag(session.user.organizationId, parsed.data.name, parsed.data.color);
  revalidatePath("/settings/tags");
  return {};
}

export async function deleteTagAction(formData: FormData): Promise<void> {
  const session = await requirePermission("organization:manage");
  const tagId = String(formData.get("tagId"));

  await deleteTag(session.user.organizationId, tagId);
  revalidatePath("/settings/tags");
}
