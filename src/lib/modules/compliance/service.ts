import "server-only";
import { prisma } from "@/lib/db";

export class ComplianceBlockedError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "ComplianceBlockedError";
  }
}

/**
 * Enforced at the send-path boundary, not just hidden UI — see docs/08-security-checklist.md
 * §Compliance-specific controls. Source spec §30's exact rules:
 *   - DNC blocks calling workflows (not SMS).
 *   - SMS opt-out blocks further automated SMS (not calls).
 *   - Email unsubscribe blocks email.
 */

export async function assertCanCall(organizationId: string, phoneNumberId: string) {
  const phone = await prisma.phoneNumber.findFirst({ where: { id: phoneNumberId, organizationId } });
  if (!phone) throw new Error("Phone number does not belong to this organization.");
  if (phone.isDncListed) throw new ComplianceBlockedError("This number is on the Do Not Call list.");
}

export async function assertCanSms(organizationId: string, phoneNumberId: string) {
  const phone = await prisma.phoneNumber.findFirst({ where: { id: phoneNumberId, organizationId } });
  if (!phone) throw new Error("Phone number does not belong to this organization.");
  if (phone.smsOptedOut) throw new ComplianceBlockedError("This number has opted out of SMS.");
}

export async function assertCanEmail(organizationId: string, emailAddressId: string) {
  const email = await prisma.emailAddress.findFirst({ where: { id: emailAddressId, organizationId } });
  if (!email) throw new Error("Email address does not belong to this organization.");
  if (email.unsubscribed) throw new ComplianceBlockedError("This email address has unsubscribed.");
}

async function recordComplianceEvent(
  organizationId: string,
  contactId: string | null,
  channel: "SMS" | "EMAIL" | "CALL",
  eventType: string,
) {
  await prisma.complianceEvent.create({
    data: { organizationId, contactId, channel, eventType, source: "manual" },
  });
}

export async function setDncStatus(organizationId: string, phoneNumberId: string, isDncListed: boolean) {
  const phone = await prisma.phoneNumber.findFirst({ where: { id: phoneNumberId, organizationId } });
  if (!phone) throw new Error("Phone number does not belong to this organization.");

  await prisma.phoneNumber.update({ where: { id: phoneNumberId }, data: { isDncListed } });
  await recordComplianceEvent(organizationId, phone.contactId, "CALL", isDncListed ? "DNC_REQUESTED" : "DNC_CLEARED");
}

export async function setSmsOptOutStatus(organizationId: string, phoneNumberId: string, smsOptedOut: boolean) {
  const phone = await prisma.phoneNumber.findFirst({ where: { id: phoneNumberId, organizationId } });
  if (!phone) throw new Error("Phone number does not belong to this organization.");

  await prisma.phoneNumber.update({ where: { id: phoneNumberId }, data: { smsOptedOut } });
  await recordComplianceEvent(organizationId, phone.contactId, "SMS", smsOptedOut ? "SMS_STOP" : "SMS_OPT_IN");
}

export async function setEmailUnsubscribedStatus(organizationId: string, emailAddressId: string, unsubscribed: boolean) {
  const email = await prisma.emailAddress.findFirst({ where: { id: emailAddressId, organizationId } });
  if (!email) throw new Error("Email address does not belong to this organization.");

  await prisma.emailAddress.update({ where: { id: emailAddressId }, data: { unsubscribed } });
  await recordComplianceEvent(
    organizationId,
    email.contactId,
    "EMAIL",
    unsubscribed ? "EMAIL_UNSUBSCRIBE" : "EMAIL_RESUBSCRIBE",
  );
}
