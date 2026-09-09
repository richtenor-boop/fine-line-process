"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { updateOrganization } from "@/lib/modules/organizations/service";
import { updateOrganizationSchema } from "@/lib/modules/organizations/schema";
import { writeAuditLog } from "@/lib/audit";

export interface OrgSettingsState {
  error?: string;
  success?: boolean;
}

export async function updateOrganizationAction(
  _prevState: OrgSettingsState,
  formData: FormData,
): Promise<OrgSettingsState> {
  const session = await requirePermission("organization:manage");

  const parsed = updateOrganizationSchema.safeParse({
    name: formData.get("name"),
    timezone: formData.get("timezone"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await updateOrganization(session.user.organizationId, parsed.data);
  await writeAuditLog({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: "organization.updated",
    entityType: "Organization",
    entityId: session.user.organizationId,
    newValue: parsed.data,
  });

  revalidatePath("/settings/organization");
  return { success: true };
}
