import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { createLead } from "@/lib/modules/leads/service";
import { createNotification } from "@/lib/modules/notifications/service";
import { SUBMISSIONS_PER_IP_PER_HOUR, type CreateLeadFormInput, type PublicSubmissionInput } from "./schema";

export async function listLeadForms(organizationId: string) {
  return prisma.leadForm.findMany({
    where: { organizationId },
    include: { _count: { select: { submissions: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createLeadForm(organizationId: string, createdById: string, input: CreateLeadFormInput) {
  if (input.assignedUserId) {
    const user = await prisma.user.findFirst({ where: { id: input.assignedUserId, organizationId }, select: { id: true } });
    if (!user) throw new Error("Assigned user not found.");
  }
  return prisma.leadForm.create({
    data: {
      organizationId,
      name: input.name,
      headline: input.headline || null,
      leadSourceName: input.leadSourceName,
      assignedUserId: input.assignedUserId || null,
      thankYouMessage: input.thankYouMessage || null,
      // 24 random bytes → 32 url-safe chars: unguessable, so a form can't be found by enumeration.
      publicToken: randomBytes(24).toString("base64url"),
      createdById,
    },
  });
}

/** Forms are deactivated, never deleted, so the submission history behind existing leads stays intact. */
export async function setLeadFormActive(organizationId: string, formId: string, isActive: boolean) {
  return prisma.leadForm.update({ where: { id: formId, organizationId }, data: { isActive } });
}

/** Only the fields safe to render on a public page — no ids, no assignee, no org internals. */
export async function getPublicLeadForm(publicToken: string) {
  const form = await prisma.leadForm.findFirst({
    where: { publicToken, isActive: true, organization: { deletedAt: null } },
    select: { name: true, headline: true, organization: { select: { name: true } } },
  });
  return form ? { name: form.name, headline: form.headline, organizationName: form.organization.name } : null;
}

export type SubmitLeadFormResult =
  | { status: "created" | "matched_existing"; organizationId: string; leadId: string; thankYouMessage: string | null }
  | { status: "not_found" }
  | { status: "rate_limited" };

/**
 * Turns a public submission into a CRM lead. Duplicate-safe: if the email or phone already belongs
 * to a contact in this org, that contact is reused, and if they already have an open lead the
 * submission is attached to it (with a notification) rather than creating a second lead.
 */
export async function submitLeadForm(
  publicToken: string,
  input: PublicSubmissionInput,
  ipHash: string | null,
): Promise<SubmitLeadFormResult> {
  const form = await prisma.leadForm.findFirst({
    where: { publicToken, isActive: true, organization: { deletedAt: null } },
  });
  if (!form) return { status: "not_found" };
  const organizationId = form.organizationId;

  if (ipHash) {
    const recent = await prisma.leadFormSubmission.count({
      where: { ipHash, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
    });
    if (recent >= SUBMISSIONS_PER_IP_PER_HOUR) return { status: "rate_limited" };
  }

  const email = input.email ? input.email.toLowerCase() : "";
  const phone = input.phone ?? "";
  const existingContact = await prisma.contact.findFirst({
    where: {
      organizationId,
      deletedAt: null,
      OR: [
        ...(email ? [{ emailAddresses: { some: { email } } }] : []),
        ...(phone ? [{ phoneNumbers: { some: { number: phone } } }] : []),
      ],
    },
    select: { id: true },
  });

  const existingLead = existingContact
    ? await prisma.lead.findFirst({
        where: { organizationId, contactId: existingContact.id, deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      })
    : null;

  let leadId: string;
  let status: "created" | "matched_existing";
  if (existingLead) {
    leadId = existingLead.id;
    status = "matched_existing";
  } else {
    let existingPropertyId: string | undefined;
    if (input.addressLine1 && input.zip) {
      const property = await prisma.property.findFirst({
        where: {
          organizationId,
          deletedAt: null,
          zip: input.zip,
          addressLine1: { equals: input.addressLine1, mode: "insensitive" },
        },
        select: { id: true },
      });
      existingPropertyId = property?.id;
    }

    const lead = await createLead(
      organizationId,
      {
        contactMode: existingContact ? "existing" : "new",
        contactId: existingContact?.id,
        firstName: input.firstName,
        lastName: input.lastName,
        phone,
        email,
        propertyMode: existingPropertyId ? "existing" : input.addressLine1 ? "new" : "none",
        propertyId: existingPropertyId,
        addressLine1: input.addressLine1 || undefined,
        city: input.city || undefined,
        state: input.state || undefined,
        zip: input.zip || undefined,
        leadSourceName: form.leadSourceName,
        assignedUserId: form.assignedUserId ?? "",
        motivation: "UNKNOWN",
        timeline: input.timeline ?? "",
      },
      null,
    );
    leadId = lead.id;
    status = "created";
  }

  await prisma.leadFormSubmission.create({
    data: { organizationId, formId: form.id, leadId, message: input.message || null, ipHash },
  });

  const notifyUserId = form.assignedUserId ?? form.createdById;
  if (notifyUserId) {
    await createNotification(organizationId, {
      userId: notifyUserId,
      type: "lead_form_submission",
      title:
        status === "created"
          ? `New web lead: ${input.firstName} ${input.lastName}`
          : `${input.firstName} ${input.lastName} submitted "${form.name}" again`,
      body: input.message || undefined,
      entityType: "Lead",
      entityId: leadId,
    });
  }

  return { status, organizationId, leadId, thankYouMessage: form.thankYouMessage };
}

export async function listLeadFormSubmissions(organizationId: string, leadId: string) {
  return prisma.leadFormSubmission.findMany({
    where: { organizationId, leadId },
    include: { form: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}
