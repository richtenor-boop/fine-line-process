"use server";

import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { createProperty } from "@/lib/modules/properties/service";
import { createPropertySchema, newOwnerContactSchema } from "@/lib/modules/properties/schema";
import { writeAuditLog } from "@/lib/audit";

export interface CreatePropertyState {
  error?: string;
}

export async function createPropertyAction(
  _prevState: CreatePropertyState,
  formData: FormData,
): Promise<CreatePropertyState> {
  const session = await requirePermission("properties:edit");

  const parsed = createPropertySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const ownerMode = formData.get("ownerContactMode")?.toString(); // "existing" | "new"
  const existingOwnerContactId =
    ownerMode === "existing" ? formData.get("ownerContactId")?.toString() || undefined : undefined;

  let newOwnerContact;
  if (ownerMode === "new") {
    const ownerParsed = newOwnerContactSchema.partial().safeParse({
      firstName: formData.get("ownerFirstName"),
      lastName: formData.get("ownerLastName"),
      phone: formData.get("ownerPhone"),
      email: formData.get("ownerEmail"),
    });
    if (ownerParsed.success && ownerParsed.data.firstName && ownerParsed.data.lastName) {
      newOwnerContact = ownerParsed.data as { firstName: string; lastName: string; phone?: string; email?: string };
    }
  }

  const property = await createProperty(session.user.organizationId, parsed.data, {
    existingOwnerContactId,
    newOwnerContact,
  });

  await writeAuditLog({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: "property.created",
    entityType: "Property",
    entityId: property.id,
    newValue: { addressLine1: property.addressLine1 },
  });

  redirect(`/properties/${property.id}`);
}
