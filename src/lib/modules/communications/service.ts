import "server-only";
import { prisma } from "@/lib/db";
import { getTelephonyProvider } from "@/lib/integrations/telephony";
import { getEmailProvider } from "@/lib/integrations/email";
import { assertCanCall, assertCanSms, assertCanEmail, setSmsOptOutStatus } from "@/lib/modules/compliance/service";
import type { LogCallInput, SendSmsInput, SendEmailInput, LogInboundInput } from "./schema";

const MOCK_ORG_FROM_NUMBER = "+15550000000"; // no real number provisioned yet — see docs/06-integrations.md
const MOCK_ORG_FROM_EMAIL = process.env.EMAIL_FROM_ADDRESS || "noreply@fineline.demo";

async function getOrCreateConversation(organizationId: string, leadId: string, channel: "SMS" | "EMAIL" | "CALL") {
  const existing = await prisma.conversation.findFirst({ where: { organizationId, leadId, channel } });
  if (existing) return existing;
  return prisma.conversation.create({ data: { organizationId, leadId, channel } });
}

export async function logCall(organizationId: string, handledByUserId: string, input: LogCallInput) {
  const phone = await prisma.phoneNumber.findFirst({ where: { id: input.phoneNumberId, organizationId } });
  if (!phone) throw new Error("Phone number does not belong to this organization.");

  let providerCallSid: string | undefined;
  if (input.direction === "OUTBOUND") {
    await assertCanCall(organizationId, input.phoneNumberId);
    const result = await getTelephonyProvider().placeCall({ to: phone.number, from: MOCK_ORG_FROM_NUMBER });
    providerCallSid = result.providerCallSid;
  }

  const conversation = await getOrCreateConversation(organizationId, input.leadId, "CALL");

  return prisma.call.create({
    data: {
      organizationId,
      leadId: input.leadId,
      conversationId: conversation.id,
      handledByUserId,
      direction: input.direction,
      fromNumber: input.direction === "OUTBOUND" ? MOCK_ORG_FROM_NUMBER : phone.number,
      toNumber: input.direction === "OUTBOUND" ? phone.number : MOCK_ORG_FROM_NUMBER,
      durationSeconds: input.durationSeconds ?? null,
      disposition: input.disposition ?? null,
      notes: input.notes || null,
      providerCallSid,
    },
  });
}

export async function sendSms(organizationId: string, userId: string, input: SendSmsInput) {
  const phone = await prisma.phoneNumber.findFirst({ where: { id: input.phoneNumberId, organizationId } });
  if (!phone) throw new Error("Phone number does not belong to this organization.");

  await assertCanSms(organizationId, input.phoneNumberId);
  const result = await getTelephonyProvider().sendSms({ to: phone.number, from: MOCK_ORG_FROM_NUMBER, body: input.body });

  const conversation = await getOrCreateConversation(organizationId, input.leadId, "SMS");
  const message = await prisma.smsMessage.create({
    data: {
      organizationId,
      leadId: input.leadId,
      conversationId: conversation.id,
      direction: "OUTBOUND",
      fromNumber: MOCK_ORG_FROM_NUMBER,
      toNumber: phone.number,
      body: input.body,
      status: result.status === "SENT" ? "SENT" : "FAILED",
      providerMessageSid: result.providerMessageSid,
      sentByUserId: userId,
    },
  });
  await prisma.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } });
  return message;
}

export async function sendEmail(organizationId: string, userId: string, input: SendEmailInput) {
  const email = await prisma.emailAddress.findFirst({ where: { id: input.emailAddressId, organizationId } });
  if (!email) throw new Error("Email address does not belong to this organization.");

  await assertCanEmail(organizationId, input.emailAddressId);
  const result = await getEmailProvider().sendEmail({
    to: email.email,
    from: MOCK_ORG_FROM_EMAIL,
    subject: input.subject,
    bodyHtml: input.bodyHtml,
  });

  const conversation = await getOrCreateConversation(organizationId, input.leadId, "EMAIL");
  const message = await prisma.email.create({
    data: {
      organizationId,
      leadId: input.leadId,
      conversationId: conversation.id,
      direction: "OUTBOUND",
      fromAddress: MOCK_ORG_FROM_EMAIL,
      toAddress: email.email,
      subject: input.subject,
      bodyHtml: input.bodyHtml,
      status: result.status === "SENT" ? "SENT" : "FAILED",
      providerMessageId: result.providerMessageId,
      sentByUserId: userId,
    },
  });
  await prisma.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } });
  return message;
}

/**
 * Stands in for a real provider's inbound webhook, which doesn't exist yet (no public URL, no
 * live Twilio/SendGrid account — see docs/06-integrations.md). Lets the Inbox demonstrate a real
 * two-way thread and gives QA a way to exercise inbound handling, including the STOP-keyword
 * auto-opt-out a real webhook would also perform.
 */
export async function logInbound(organizationId: string, input: LogInboundInput) {
  const conversation = await getOrCreateConversation(organizationId, input.leadId, input.channel);
  await prisma.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } });

  if (input.channel === "SMS") {
    if (!input.phoneNumberId) throw new Error("Select which number the message came from.");
    const phone = await prisma.phoneNumber.findFirst({ where: { id: input.phoneNumberId, organizationId } });
    if (!phone) throw new Error("Phone number does not belong to this organization.");

    if (input.body.trim().toUpperCase() === "STOP") {
      await setSmsOptOutStatus(organizationId, phone.id, true);
    }

    return prisma.smsMessage.create({
      data: {
        organizationId,
        leadId: input.leadId,
        conversationId: conversation.id,
        direction: "INBOUND",
        fromNumber: phone.number,
        toNumber: MOCK_ORG_FROM_NUMBER,
        body: input.body,
        status: "RECEIVED",
      },
    });
  }

  if (!input.emailAddressId) throw new Error("Select which address the message came from.");
  const email = await prisma.emailAddress.findFirst({ where: { id: input.emailAddressId, organizationId } });
  if (!email) throw new Error("Email address does not belong to this organization.");

  return prisma.email.create({
    data: {
      organizationId,
      leadId: input.leadId,
      conversationId: conversation.id,
      direction: "INBOUND",
      fromAddress: email.email,
      toAddress: MOCK_ORG_FROM_EMAIL,
      subject: input.subject || "(no subject)",
      bodyHtml: input.body,
      status: "RECEIVED",
    },
  });
}

export interface CommunicationEvent {
  kind: "call" | "sms" | "email";
  at: Date;
  direction: "INBOUND" | "OUTBOUND";
  summary: string;
  detail?: string;
}

export async function listCommunicationsForLead(organizationId: string, leadId: string): Promise<CommunicationEvent[]> {
  const [calls, smsMessages, emails] = await Promise.all([
    prisma.call.findMany({ where: { organizationId, leadId }, include: { handledBy: true }, orderBy: { createdAt: "desc" } }),
    prisma.smsMessage.findMany({ where: { organizationId, leadId }, orderBy: { createdAt: "desc" } }),
    prisma.email.findMany({ where: { organizationId, leadId }, orderBy: { createdAt: "desc" } }),
  ]);

  const events: CommunicationEvent[] = [];
  for (const c of calls) {
    events.push({
      kind: "call",
      at: c.createdAt,
      direction: c.direction,
      summary: `${c.direction === "OUTBOUND" ? "Outbound" : "Inbound"} call${c.disposition ? ` — ${c.disposition.replace(/_/g, " ")}` : ""}`,
      detail: c.notes ?? undefined,
    });
  }
  for (const s of smsMessages) {
    events.push({
      kind: "sms",
      at: s.createdAt,
      direction: s.direction,
      summary: `${s.direction === "OUTBOUND" ? "You" : "Them"}: ${s.body}`,
    });
  }
  for (const e of emails) {
    events.push({
      kind: "email",
      at: e.createdAt,
      direction: e.direction,
      summary: e.subject ?? "(no subject)",
      detail: e.bodyHtml ?? undefined,
    });
  }

  return events.sort((a, b) => b.at.getTime() - a.at.getTime());
}

export interface InboxRow {
  leadId: string;
  contactName: string;
  lastActivityAt: Date;
  lastChannel: "SMS" | "EMAIL" | "CALL";
  preview: string;
}

export async function listInboxOverview(organizationId: string): Promise<InboxRow[]> {
  const conversations = await prisma.conversation.findMany({
    where: { organizationId },
    include: {
      lead: { include: { contact: true } },
      smsMessages: { orderBy: { createdAt: "desc" }, take: 1 },
      emails: { orderBy: { createdAt: "desc" }, take: 1 },
      calls: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { lastMessageAt: "desc" },
  });

  const byLead = new Map<string, InboxRow>();
  for (const conv of conversations) {
    const preview =
      conv.smsMessages[0]?.body ?? conv.emails[0]?.subject ?? (conv.calls[0] ? "Call logged" : "No messages yet");
    const row: InboxRow = {
      leadId: conv.leadId,
      contactName: `${conv.lead.contact.firstName} ${conv.lead.contact.lastName}`,
      lastActivityAt: conv.lastMessageAt,
      lastChannel: conv.channel,
      preview,
    };
    const existing = byLead.get(conv.leadId);
    if (!existing || row.lastActivityAt > existing.lastActivityAt) byLead.set(conv.leadId, row);
  }

  return [...byLead.values()].sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime());
}
