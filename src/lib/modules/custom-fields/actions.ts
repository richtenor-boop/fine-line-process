"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { setCustomFieldValue } from "./service";

export async function setCustomFieldValueAction(formData: FormData): Promise<void> {
  const definitionId = String(formData.get("definitionId"));
  const entityId = String(formData.get("entityId"));
  const entityType = String(formData.get("entityType")); // "LEAD" | "PROPERTY"
  const value = String(formData.get("value") ?? "");

  const session = await requirePermission(entityType === "LEAD" ? "leads:edit" : "properties:edit");
  await setCustomFieldValue(session.user.organizationId, definitionId, entityId, value);

  if (entityType === "LEAD") revalidatePath(`/leads/${entityId}`);
  else revalidatePath(`/properties/${entityId}`);
}
