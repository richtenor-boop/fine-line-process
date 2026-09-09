"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { changeLeadStage } from "./service";
import { writeAuditLog } from "@/lib/audit";
import { runAutomationsForTrigger } from "@/lib/modules/automations/executor";

/** Callable directly from a client event handler (e.g. Kanban drag-and-drop drop target) —
 * not form-bound, unlike leads/[id]/actions.ts's changeStageAction. */
export async function moveLeadStageAction(leadId: string, stageId: string, pipelineId: string) {
  const session = await requirePermission("leads:edit");

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

  revalidatePath(`/pipeline/${pipelineId}`);
  revalidatePath(`/leads/${leadId}`);
}
