"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { setRolePermission } from "@/lib/modules/roles/service";
import { writeAuditLog } from "@/lib/audit";
import type { PermissionKey } from "@/lib/rbac/permissions";

export async function toggleRolePermissionAction(roleId: string, permissionKey: PermissionKey, granted: boolean) {
  const session = await requirePermission("roles:manage");

  await setRolePermission(session.user.organizationId, roleId, permissionKey, granted);
  await writeAuditLog({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: granted ? "role.permission_granted" : "role.permission_revoked",
    entityType: "Role",
    entityId: roleId,
    newValue: { permissionKey },
  });

  revalidatePath("/settings/roles");
}
