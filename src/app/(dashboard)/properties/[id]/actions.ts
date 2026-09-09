"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { addOwner, removeOwner } from "@/lib/modules/properties/service";
import { writeAuditLog } from "@/lib/audit";

export async function addOwnerAction(formData: FormData): Promise<void> {
  const session = await requirePermission("properties:edit");
  const propertyId = String(formData.get("propertyId"));
  const contactId = String(formData.get("contactId"));
  if (!contactId) return;

  await addOwner(session.user.organizationId, propertyId, contactId);
  await writeAuditLog({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: "property.owner_added",
    entityType: "Property",
    entityId: propertyId,
    newValue: { contactId },
  });
  revalidatePath(`/properties/${propertyId}`);
}

export async function removeOwnerAction(formData: FormData): Promise<void> {
  const session = await requirePermission("properties:edit");
  const propertyId = String(formData.get("propertyId"));
  const propertyOwnerId = String(formData.get("propertyOwnerId"));

  await removeOwner(session.user.organizationId, propertyOwnerId);
  revalidatePath(`/properties/${propertyId}`);
}
