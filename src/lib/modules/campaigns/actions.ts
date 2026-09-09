"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import {
  createCampaign,
  addCampaignStep,
  removeCampaignStep,
  enrollLead,
  stopEnrollment,
  processDueCampaignEnrollments,
} from "./service";
import { createCampaignSchema, addCampaignStepSchema } from "./schema";
import { writeAuditLog } from "@/lib/audit";

export interface CreateCampaignState {
  error?: string;
}

export async function createCampaignAction(_prevState: CreateCampaignState, formData: FormData): Promise<CreateCampaignState> {
  const session = await requirePermission("campaigns:manage");

  const parsed = createCampaignSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const campaign = await createCampaign(session.user.organizationId, session.user.id, parsed.data);
  await writeAuditLog({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: "campaign.created",
    entityType: "Campaign",
    entityId: campaign.id,
  });
  revalidatePath("/campaigns");
  redirect(`/campaigns/${campaign.id}`);
}

export interface AddCampaignStepState {
  error?: string;
}

export async function addCampaignStepAction(
  _prevState: AddCampaignStepState,
  formData: FormData,
): Promise<AddCampaignStepState> {
  const session = await requirePermission("campaigns:manage");

  const parsed = addCampaignStepSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const step = await addCampaignStep(session.user.organizationId, parsed.data);
  revalidatePath(`/campaigns/${parsed.data.campaignId}`);
  return step ? {} : { error: "Could not add step." };
}

export async function removeCampaignStepAction(formData: FormData): Promise<void> {
  const session = await requirePermission("campaigns:manage");
  const stepId = String(formData.get("stepId"));
  const campaignId = String(formData.get("campaignId"));

  await removeCampaignStep(session.user.organizationId, stepId);
  revalidatePath(`/campaigns/${campaignId}`);
}

export async function enrollLeadAction(formData: FormData): Promise<void> {
  const session = await requirePermission("campaigns:manage");
  const campaignId = String(formData.get("campaignId"));
  const leadId = String(formData.get("leadId"));

  await enrollLead(session.user.organizationId, campaignId, leadId);
  await writeAuditLog({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: "campaign.lead_enrolled",
    entityType: "Lead",
    entityId: leadId,
    newValue: { campaignId },
  });
  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath(`/leads/${leadId}`);
}

export async function stopEnrollmentAction(formData: FormData): Promise<void> {
  const session = await requirePermission("campaigns:manage");
  const campaignId = String(formData.get("campaignId"));
  const leadId = String(formData.get("leadId"));

  await stopEnrollment(session.user.organizationId, campaignId, leadId, "Stopped manually");
  revalidatePath(`/campaigns/${campaignId}`);
}

export async function processDueCampaignsAction(): Promise<{ checked: number; processed: number }> {
  const session = await requirePermission("campaigns:manage");
  const result = await processDueCampaignEnrollments(session.user.organizationId, session.user.id);
  revalidatePath("/campaigns");
  return result;
}
