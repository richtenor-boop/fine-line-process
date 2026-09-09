"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { createTeam, addTeamMember, removeTeamMember, deleteTeam } from "@/lib/modules/teams/service";
import { createTeamSchema } from "@/lib/modules/teams/schema";
import { writeAuditLog } from "@/lib/audit";

export interface CreateTeamState {
  error?: string;
}

export async function createTeamAction(_prevState: CreateTeamState, formData: FormData): Promise<CreateTeamState> {
  const session = await requirePermission("teams:manage");

  const parsed = createTeamSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const team = await createTeam(session.user.organizationId, parsed.data.name);
  await writeAuditLog({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: "team.created",
    entityType: "Team",
    entityId: team.id,
    newValue: { name: team.name },
  });

  revalidatePath("/settings/teams");
  return {};
}

export async function addTeamMemberAction(formData: FormData): Promise<void> {
  const session = await requirePermission("teams:manage");
  const teamId = String(formData.get("teamId"));
  const userId = String(formData.get("userId"));

  await addTeamMember(session.user.organizationId, teamId, userId);
  revalidatePath("/settings/teams");
}

export async function removeTeamMemberAction(formData: FormData): Promise<void> {
  const session = await requirePermission("teams:manage");
  const teamId = String(formData.get("teamId"));
  const userId = String(formData.get("userId"));

  await removeTeamMember(session.user.organizationId, teamId, userId);
  revalidatePath("/settings/teams");
}

export async function deleteTeamAction(formData: FormData): Promise<void> {
  const session = await requirePermission("teams:manage");
  const teamId = String(formData.get("teamId"));

  await deleteTeam(session.user.organizationId, teamId);
  await writeAuditLog({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: "team.deleted",
    entityType: "Team",
    entityId: teamId,
  });
  revalidatePath("/settings/teams");
}
