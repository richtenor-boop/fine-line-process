"use server";

import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { createLead } from "@/lib/modules/leads/service";
import { createLeadSchema } from "@/lib/modules/leads/schema";
import { writeAuditLog } from "@/lib/audit";
import { runAutomationsForTrigger } from "@/lib/modules/automations/executor";

export interface CreateLeadState {
  error?: string;
}

export async function createLeadAction(_prevState: CreateLeadState, formData: FormData): Promise<CreateLeadState> {
  const session = await requirePermission("leads:edit");

  const parsed = createLeadSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  let lead;
  try {
    lead = await createLead(session.user.organizationId, parsed.data, session.user.id);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not create lead." };
  }

  await writeAuditLog({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: "lead.created",
    entityType: "Lead",
    entityId: lead.id,
  });
  await runAutomationsForTrigger(session.user.organizationId, "LEAD_CREATED", lead.id);

  redirect(`/leads/${lead.id}`);
}
