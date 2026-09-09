"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { createNote } from "./service";
import { createNoteSchema } from "./schema";

export async function createNoteAction(formData: FormData): Promise<void> {
  const leadId = formData.get("leadId")?.toString() || undefined;
  const propertyId = formData.get("propertyId")?.toString() || undefined;
  const dealId = formData.get("dealId")?.toString() || undefined;

  const session = await requirePermission(leadId ? "leads:edit" : propertyId ? "properties:edit" : "deals:edit");

  const parsed = createNoteSchema.safeParse({ body: formData.get("body"), leadId, propertyId, dealId });
  if (!parsed.success) return; // form re-renders with the same (unsaved) input; body is required client-side too

  await createNote(session.user.organizationId, session.user.id, parsed.data);

  if (leadId) revalidatePath(`/leads/${leadId}`);
  if (propertyId) revalidatePath(`/properties/${propertyId}`);
  if (dealId) revalidatePath(`/deals/${dealId}`);
}
