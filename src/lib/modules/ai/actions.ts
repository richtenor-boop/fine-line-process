"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { scoreLead, summarizeLeadConversation } from "./service";
import { writeAuditLog } from "@/lib/audit";

export async function scoreLeadAction(leadId: string) {
  const session = await requirePermission("leads:view");
  const result = await scoreLead(session.user.organizationId, leadId);

  await writeAuditLog({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: "lead.ai_scored",
    entityType: "Lead",
    entityId: leadId,
    newValue: { score: result.score, motivationLabel: result.motivationLabel },
  });

  revalidatePath(`/leads/${leadId}`);
  return result;
}

export async function summarizeConversationAction(leadId: string) {
  const session = await requirePermission("communications:send");
  return summarizeLeadConversation(session.user.organizationId, leadId);
}
