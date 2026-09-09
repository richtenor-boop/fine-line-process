"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { assignTagToLead, removeTagFromLead } from "./service";
import { writeAuditLog } from "@/lib/audit";
import { runAutomationsForTrigger } from "@/lib/modules/automations/executor";

export async function assignTagAction(formData: FormData): Promise<void> {
  const session = await requirePermission("leads:edit");
  const leadId = String(formData.get("leadId"));
  const tagName = String(formData.get("tagName") ?? "").trim();
  if (!tagName) return;

  const assignment = await assignTagToLead(session.user.organizationId, leadId, tagName);
  await writeAuditLog({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: "lead.tag_added",
    entityType: "Lead",
    entityId: leadId,
    newValue: { tagId: assignment.tagId },
  });
  await runAutomationsForTrigger(session.user.organizationId, "TAG_ADDED", leadId);
  revalidatePath(`/leads/${leadId}`);
}

export async function removeTagAction(formData: FormData): Promise<void> {
  const session = await requirePermission("leads:edit");
  const leadId = String(formData.get("leadId"));
  const tagId = String(formData.get("tagId"));

  await removeTagFromLead(session.user.organizationId, leadId, tagId);
  revalidatePath(`/leads/${leadId}`);
}
