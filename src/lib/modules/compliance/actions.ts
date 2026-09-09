"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { setDncStatus, setSmsOptOutStatus, setEmailUnsubscribedStatus } from "./service";
import { writeAuditLog } from "@/lib/audit";

async function revalidateForLead(formData: FormData) {
  const leadId = formData.get("leadId")?.toString();
  if (leadId) revalidatePath(`/inbox/${leadId}`);
}

export async function setDncAction(formData: FormData): Promise<void> {
  const session = await requirePermission("contacts:edit");
  const phoneNumberId = String(formData.get("phoneNumberId"));
  const isDncListed = formData.get("isDncListed") === "true";

  await setDncStatus(session.user.organizationId, phoneNumberId, isDncListed);
  await writeAuditLog({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: isDncListed ? "compliance.dnc_set" : "compliance.dnc_cleared",
    entityType: "PhoneNumber",
    entityId: phoneNumberId,
  });
  await revalidateForLead(formData);
}

export async function setSmsOptOutAction(formData: FormData): Promise<void> {
  const session = await requirePermission("contacts:edit");
  const phoneNumberId = String(formData.get("phoneNumberId"));
  const smsOptedOut = formData.get("smsOptedOut") === "true";

  await setSmsOptOutStatus(session.user.organizationId, phoneNumberId, smsOptedOut);
  await writeAuditLog({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: smsOptedOut ? "compliance.sms_opt_out_set" : "compliance.sms_opt_out_cleared",
    entityType: "PhoneNumber",
    entityId: phoneNumberId,
  });
  await revalidateForLead(formData);
}

export async function setEmailUnsubscribedAction(formData: FormData): Promise<void> {
  const session = await requirePermission("contacts:edit");
  const emailAddressId = String(formData.get("emailAddressId"));
  const unsubscribed = formData.get("unsubscribed") === "true";

  await setEmailUnsubscribedStatus(session.user.organizationId, emailAddressId, unsubscribed);
  await writeAuditLog({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: unsubscribed ? "compliance.email_unsubscribed_set" : "compliance.email_unsubscribed_cleared",
    entityType: "EmailAddress",
    entityId: emailAddressId,
  });
  await revalidateForLead(formData);
}
