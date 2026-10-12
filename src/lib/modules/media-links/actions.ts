"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { createMediaLinkSchema } from "./schema";
import { createMediaLink, deleteMediaLink } from "./service";

export interface MediaLinkState {
  error?: string;
  savedAt?: number;
}

function revalidate(propertyId?: string, leadId?: string) {
  if (propertyId) revalidatePath(`/properties/${propertyId}`);
  if (leadId) revalidatePath(`/leads/${leadId}`);
}

export async function createMediaLinkAction(_prev: MediaLinkState, formData: FormData): Promise<MediaLinkState> {
  const parsed = createMediaLinkSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the link and try again." };
  const session = await requirePermission(parsed.data.propertyId ? "properties:edit" : "leads:edit");
  try {
    await createMediaLink(session.user.organizationId, session.user.id, parsed.data);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save the link." };
  }
  revalidate(parsed.data.propertyId || undefined, parsed.data.leadId || undefined);
  return { savedAt: Date.now() };
}

export async function deleteMediaLinkAction(formData: FormData): Promise<void> {
  const propertyId = String(formData.get("propertyId") ?? "") || undefined;
  const leadId = String(formData.get("leadId") ?? "") || undefined;
  const session = await requirePermission(propertyId ? "properties:edit" : "leads:edit");
  await deleteMediaLink(session.user.organizationId, String(formData.get("linkId")));
  revalidate(propertyId, leadId);
}
