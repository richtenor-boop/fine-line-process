"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { createUser, changeUserRole, setUserStatus } from "@/lib/modules/users/service";
import { createUserSchema } from "@/lib/modules/users/schema";
import { writeAuditLog } from "@/lib/audit";

export interface CreateUserState {
  error?: string;
  createdEmail?: string;
  temporaryPassword?: string;
}

export async function createUserAction(
  _prevState: CreateUserState,
  formData: FormData,
): Promise<CreateUserState> {
  const session = await requirePermission("users:manage");

  const parsed = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    roleId: formData.get("roleId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const { user, temporaryPassword } = await createUser(session.user.organizationId, parsed.data);
    await writeAuditLog({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: "user.created",
      entityType: "User",
      entityId: user.id,
      newValue: { email: user.email, roleId: user.roleId },
    });
    revalidatePath("/settings/users");
    return { createdEmail: user.email, temporaryPassword };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not create user." };
  }
}

export async function changeUserRoleAction(formData: FormData): Promise<void> {
  const session = await requirePermission("users:manage");
  const userId = String(formData.get("userId"));
  const roleId = String(formData.get("roleId"));

  await changeUserRole(session.user.organizationId, userId, roleId);
  await writeAuditLog({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: "user.role_changed",
    entityType: "User",
    entityId: userId,
    newValue: { roleId },
  });
  revalidatePath("/settings/users");
}

export async function toggleUserStatusAction(formData: FormData): Promise<void> {
  const session = await requirePermission("users:manage");
  const userId = String(formData.get("userId"));
  const nextStatus = formData.get("nextStatus") === "ACTIVE" ? "ACTIVE" : "SUSPENDED";

  await setUserStatus(session.user.organizationId, userId, nextStatus);
  await writeAuditLog({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: nextStatus === "ACTIVE" ? "user.reactivated" : "user.suspended",
    entityType: "User",
    entityId: userId,
  });
  revalidatePath("/settings/users");
}
