"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { logCall, sendSms, sendEmail, logInbound } from "./service";
import { logCallSchema, sendSmsSchema, sendEmailSchema, logInboundSchema } from "./schema";
import { ComplianceBlockedError } from "@/lib/modules/compliance/service";
import { writeAuditLog } from "@/lib/audit";
import { runAutomationsForTrigger } from "@/lib/modules/automations/executor";

export interface CommsActionState {
  error?: string;
}

export async function logCallAction(_prevState: CommsActionState, formData: FormData): Promise<CommsActionState> {
  const session = await requirePermission("communications:calls_make");

  const parsed = logCallSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    const call = await logCall(session.user.organizationId, session.user.id, parsed.data);
    await writeAuditLog({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: "call.logged",
      entityType: "Call",
      entityId: call.id,
      newValue: { direction: parsed.data.direction, disposition: parsed.data.disposition },
    });
  } catch (err) {
    if (err instanceof ComplianceBlockedError) return { error: err.message };
    return { error: err instanceof Error ? err.message : "Could not log call." };
  }

  revalidatePath(`/inbox/${parsed.data.leadId}`);
  return {};
}

export async function sendSmsAction(_prevState: CommsActionState, formData: FormData): Promise<CommsActionState> {
  const session = await requirePermission("communications:send");

  const parsed = sendSmsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    await sendSms(session.user.organizationId, session.user.id, parsed.data);
  } catch (err) {
    if (err instanceof ComplianceBlockedError) return { error: err.message };
    return { error: err instanceof Error ? err.message : "Could not send SMS." };
  }

  revalidatePath(`/inbox/${parsed.data.leadId}`);
  return {};
}

export async function sendEmailAction(_prevState: CommsActionState, formData: FormData): Promise<CommsActionState> {
  const session = await requirePermission("communications:send");

  const parsed = sendEmailSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    await sendEmail(session.user.organizationId, session.user.id, parsed.data);
  } catch (err) {
    if (err instanceof ComplianceBlockedError) return { error: err.message };
    return { error: err instanceof Error ? err.message : "Could not send email." };
  }

  revalidatePath(`/inbox/${parsed.data.leadId}`);
  return {};
}

export async function logInboundAction(_prevState: CommsActionState, formData: FormData): Promise<CommsActionState> {
  const session = await requirePermission("communications:send");

  const parsed = logInboundSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    await logInbound(session.user.organizationId, parsed.data);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not log inbound message." };
  }

  await runAutomationsForTrigger(
    session.user.organizationId,
    parsed.data.channel === "SMS" ? "SMS_RECEIVED" : "EMAIL_RECEIVED",
    parsed.data.leadId,
  );
  revalidatePath(`/inbox/${parsed.data.leadId}`);
  return {};
}
