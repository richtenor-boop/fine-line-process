"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { createCustomFieldDefinition, deleteCustomFieldDefinition } from "@/lib/modules/custom-fields/service";
import { createCustomFieldSchema } from "@/lib/modules/custom-fields/schema";

export interface CreateCustomFieldState {
  error?: string;
}

export async function createCustomFieldAction(
  _prevState: CreateCustomFieldState,
  formData: FormData,
): Promise<CreateCustomFieldState> {
  const session = await requirePermission("organization:manage");

  const parsed = createCustomFieldSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  await createCustomFieldDefinition(session.user.organizationId, parsed.data);
  revalidatePath("/settings/custom-fields");
  return {};
}

export async function deleteCustomFieldAction(formData: FormData): Promise<void> {
  const session = await requirePermission("organization:manage");
  const definitionId = String(formData.get("definitionId"));

  await deleteCustomFieldDefinition(session.user.organizationId, definitionId);
  revalidatePath("/settings/custom-fields");
}
