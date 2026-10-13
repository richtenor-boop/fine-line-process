"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { env } from "@/lib/env";
import { writeAuditLog } from "@/lib/audit";
import { publicSubmissionSchema } from "@/lib/modules/lead-forms/schema";
import { submitLeadForm } from "@/lib/modules/lead-forms/service";
import { runAutomationsForTrigger } from "@/lib/modules/automations/executor";

export interface PublicSubmitState {
  error?: string;
  done?: boolean;
  thankYouMessage?: string | null;
}

/** Hashed, never stored raw. Best-effort only: x-forwarded-for is client-controllable unless the
 * hosting proxy overwrites it, so this throttles casual spam, not a determined attacker. */
async function requesterIpHash(): Promise<string | null> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim();
  if (!ip) return null;
  return createHash("sha256").update(`${ip}:${env.AUTH_SECRET}`).digest("hex");
}

/**
 * Public, unauthenticated by design — this is the one Server Action reachable without a session.
 * It can only ever create/attach a lead in the org that owns `publicToken`; it never reads or
 * returns CRM data beyond the form's own thank-you message.
 */
export async function submitPublicLeadFormAction(
  publicToken: string,
  _prev: PublicSubmitState,
  formData: FormData,
): Promise<PublicSubmitState> {
  // Honeypot: real people never see or fill this field; bots that fill every input do. Pretend
  // success so the bot gets no signal to adapt.
  if (formData.get("company_website")) return { done: true, thankYouMessage: null };

  const parsed = publicSubmissionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };

  const result = await submitLeadForm(publicToken, parsed.data, await requesterIpHash());
  if (result.status === "not_found") return { error: "This form is no longer accepting submissions." };
  if (result.status === "rate_limited") return { error: "Too many submissions from your network. Please try again later." };

  await writeAuditLog({
    organizationId: result.organizationId,
    userId: null,
    action: result.status === "created" ? "lead.created_from_form" : "lead.form_resubmitted",
    entityType: "Lead",
    entityId: result.leadId,
  });

  // Automations must never make the seller's submission look like it failed.
  try {
    if (result.status === "created") {
      await runAutomationsForTrigger(result.organizationId, "LEAD_CREATED", result.leadId);
    }
    await runAutomationsForTrigger(result.organizationId, "FORM_SUBMITTED", result.leadId);
  } catch (err) {
    console.error("[lead-forms] automation run failed:", err);
  }

  return { done: true, thankYouMessage: result.thankYouMessage };
}
