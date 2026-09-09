"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { changeLeadStage, assignLead, updateLeadDetails } from "@/lib/modules/leads/service";
import { updateLeadDetailsSchema } from "@/lib/modules/leads/schema";
import { writeAuditLog } from "@/lib/audit";
import { runAutomationsForTrigger } from "@/lib/modules/automations/executor";

export async function changeStageAction(formData: FormData): Promise<void> {
  const session = await requirePermission("leads:edit");
  const leadId = String(formData.get("leadId"));
  const stageId = String(formData.get("stageId"));

  await changeLeadStage(session.user.organizationId, leadId, stageId, session.user.id);
  await writeAuditLog({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: "lead.stage_changed",
    entityType: "Lead",
    entityId: leadId,
    newValue: { stageId },
  });
  await runAutomationsForTrigger(session.user.organizationId, "STAGE_CHANGED", leadId);
  revalidatePath(`/leads/${leadId}`);
}

export async function assignLeadAction(formData: FormData): Promise<void> {
  const session = await requirePermission("leads:assign");
  const leadId = String(formData.get("leadId"));
  const assignedUserId = formData.get("assignedUserId")?.toString() || null;

  await assignLead(session.user.organizationId, leadId, assignedUserId);
  await writeAuditLog({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: "lead.assigned",
    entityType: "Lead",
    entityId: leadId,
    newValue: { assignedUserId },
  });
  revalidatePath(`/leads/${leadId}`);
}

export interface UpdateLeadDetailsState {
  error?: string;
  success?: boolean;
}

export async function updateLeadDetailsAction(
  _prevState: UpdateLeadDetailsState,
  formData: FormData,
): Promise<UpdateLeadDetailsState> {
  const session = await requirePermission("leads:edit");
  const leadId = String(formData.get("leadId"));

  const parsed = updateLeadDetailsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  await updateLeadDetails(session.user.organizationId, leadId, parsed.data);
  await runAutomationsForTrigger(session.user.organizationId, "LEAD_UPDATED", leadId);
  revalidatePath(`/leads/${leadId}`);
  return { success: true };
}
