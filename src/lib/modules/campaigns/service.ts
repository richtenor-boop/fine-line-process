import "server-only";
import { prisma } from "@/lib/db";
import { sendSms, sendEmail } from "@/lib/modules/communications/service";
import { createTask } from "@/lib/modules/tasks/service";
import type { CreateCampaignInput, AddCampaignStepInput } from "./schema";

export async function listCampaigns(organizationId: string) {
  return prisma.campaign.findMany({
    where: { organizationId },
    include: { steps: { orderBy: { order: "asc" } }, _count: { select: { enrollments: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCampaign(organizationId: string, campaignId: string) {
  return prisma.campaign.findFirst({
    where: { id: campaignId, organizationId },
    include: {
      steps: { orderBy: { order: "asc" } },
      enrollments: { include: { lead: { include: { contact: true } } }, orderBy: { enrolledAt: "desc" } },
    },
  });
}

export async function createCampaign(organizationId: string, createdById: string, input: CreateCampaignInput) {
  return prisma.campaign.create({
    data: {
      organizationId,
      name: input.name,
      respectQuietHours: input.respectQuietHours,
      respectBusinessHours: input.respectBusinessHours,
      status: "ACTIVE",
      createdById,
    },
  });
}

export async function addCampaignStep(organizationId: string, input: AddCampaignStepInput) {
  const campaign = await prisma.campaign.findFirst({ where: { id: input.campaignId, organizationId } });
  if (!campaign) throw new Error("Campaign does not belong to this organization.");

  const maxOrder = await prisma.campaignStep.aggregate({
    where: { campaignId: input.campaignId },
    _max: { order: true },
  });

  return prisma.campaignStep.create({
    data: {
      campaignId: input.campaignId,
      order: (maxOrder._max.order ?? -1) + 1,
      channel: input.channel,
      delayDays: input.delayDays,
      subject: input.subject || null,
      templateBody: input.templateBody || null,
    },
  });
}

export async function removeCampaignStep(organizationId: string, stepId: string) {
  const step = await prisma.campaignStep.findFirst({ where: { id: stepId, campaign: { organizationId } } });
  if (!step) throw new Error("Step does not belong to this organization.");
  await prisma.campaignStep.delete({ where: { id: stepId } });
}

export async function enrollLead(organizationId: string, campaignId: string, leadId: string) {
  const [campaign, lead] = await Promise.all([
    prisma.campaign.findFirst({ where: { id: campaignId, organizationId } }),
    prisma.lead.findFirst({ where: { id: leadId, organizationId } }),
  ]);
  if (!campaign || !lead) throw new Error("Campaign or lead does not belong to this organization.");

  const existing = await prisma.campaignEnrollment.findUnique({ where: { campaignId_leadId: { campaignId, leadId } } });
  if (existing && existing.status === "ACTIVE") return existing;
  if (existing) {
    return prisma.campaignEnrollment.update({
      where: { id: existing.id },
      data: { status: "ACTIVE", currentStepOrder: 0, enrolledAt: new Date(), completedAt: null, stoppedReason: null },
    });
  }
  return prisma.campaignEnrollment.create({ data: { campaignId, leadId } });
}

export async function listEnrollmentsForLead(organizationId: string, leadId: string) {
  return prisma.campaignEnrollment.findMany({
    where: { leadId, campaign: { organizationId } },
    include: { campaign: { include: { steps: true } } },
    orderBy: { enrolledAt: "desc" },
  });
}

export async function stopEnrollment(organizationId: string, campaignId: string, leadId: string, reason: string) {
  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, organizationId } });
  if (!campaign) throw new Error("Campaign does not belong to this organization.");

  await prisma.campaignEnrollment.updateMany({
    where: { campaignId, leadId, status: "ACTIVE" },
    data: { status: "STOPPED", stoppedReason: reason },
  });
}

// --- Progression engine ---------------------------------------------------------------------

/** Local hour (0-23) in the organization's IANA timezone, using Intl — no date-tz library needed. */
function localHour(timezone: string, at: Date): number {
  const formatted = new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", hour12: false }).format(at);
  return Number(formatted) % 24;
}
function localWeekday(timezone: string, at: Date): number {
  // 0 = Sunday ... 6 = Saturday
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" }).format(at);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
}

/** Quiet hours (8am–9pm) gate SMS; business hours (Mon–Fri 8am–6pm) gate the human-driven
 * PHONE_TASK/VOICEMAIL/DIRECT_MAIL_TASK channels — see docs/05-mvp-plan.md Phase 6. */
function isWithinSendWindow(channel: string, timezone: string, respectQuietHours: boolean, respectBusinessHours: boolean): boolean {
  const now = new Date();
  if (channel === "SMS" && respectQuietHours) {
    const hour = localHour(timezone, now);
    if (hour < 8 || hour >= 21) return false;
  }
  if ((channel === "PHONE_TASK" || channel === "VOICEMAIL" || channel === "DIRECT_MAIL_TASK") && respectBusinessHours) {
    const weekday = localWeekday(timezone, now);
    const hour = localHour(timezone, now);
    if (weekday === 0 || weekday === 6 || hour < 8 || hour >= 18) return false;
  }
  return true;
}

/**
 * Advances every ACTIVE enrollment in the org whose next step is due. Designed to be called both
 * from a real scheduler (POST /api/cron/campaign-tick, external — see docs/06-integrations.md,
 * this sandbox has no cron infra of its own) and manually from Settings > Campaigns, so the
 * feature is fully testable without one. Idempotent-safe to call repeatedly.
 */
export async function processDueCampaignEnrollments(organizationId: string, systemUserId: string) {
  const organization = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
  const enrollments = await prisma.campaignEnrollment.findMany({
    where: { campaign: { organizationId }, status: "ACTIVE" },
    include: {
      campaign: { include: { steps: { orderBy: { order: "asc" } } } },
      lead: { include: { contact: { include: { phoneNumbers: true, emailAddresses: true } } } },
    },
  });

  let processed = 0;
  for (const enrollment of enrollments) {
    const steps = enrollment.campaign.steps;
    if (enrollment.currentStepOrder >= steps.length) {
      await prisma.campaignEnrollment.update({
        where: { id: enrollment.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      continue;
    }

    const step = steps[enrollment.currentStepOrder];
    const cumulativeDelayDays = steps.slice(0, enrollment.currentStepOrder + 1).reduce((sum, s) => sum + s.delayDays, 0);
    const dueAt = new Date(enrollment.enrolledAt.getTime() + cumulativeDelayDays * 86400000);
    if (new Date() < dueAt) continue; // not due yet

    if (
      !isWithinSendWindow(step.channel, organization.timezone, enrollment.campaign.respectQuietHours, enrollment.campaign.respectBusinessHours)
    ) {
      continue; // due, but outside the allowed window — retry next tick, don't advance
    }

    await executeCampaignStep(organizationId, systemUserId, enrollment.leadId, step);
    processed += 1;

    const nextOrder = enrollment.currentStepOrder + 1;
    await prisma.campaignEnrollment.update({
      where: { id: enrollment.id },
      data:
        nextOrder >= steps.length
          ? { currentStepOrder: nextOrder, status: "COMPLETED", completedAt: new Date() }
          : { currentStepOrder: nextOrder },
    });
  }

  return { checked: enrollments.length, processed };
}

async function executeCampaignStep(
  organizationId: string,
  systemUserId: string,
  leadId: string,
  step: { channel: string; templateBody: string | null; subject: string | null },
) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId },
    include: { contact: { include: { phoneNumbers: true, emailAddresses: true } }, assignedUser: true },
  });
  if (!lead) return;

  try {
    if (step.channel === "SMS") {
      const phone = lead.contact.phoneNumbers.find((p) => p.isPrimary) ?? lead.contact.phoneNumbers[0];
      if (phone && step.templateBody) {
        await sendSms(organizationId, systemUserId, { leadId, phoneNumberId: phone.id, body: step.templateBody });
      }
    } else if (step.channel === "EMAIL") {
      const email = lead.contact.emailAddresses.find((e) => e.isPrimary) ?? lead.contact.emailAddresses[0];
      if (email && step.templateBody) {
        await sendEmail(organizationId, systemUserId, {
          leadId,
          emailAddressId: email.id,
          subject: step.subject || "Following up",
          bodyHtml: step.templateBody,
        });
      }
    } else {
      // PHONE_TASK / VOICEMAIL / DIRECT_MAIL_TASK — human-driven channels create a task, not an
      // automated send (source spec §10's example flow: "Day 1 Call Task", "Day 14 Letter").
      const label = step.channel === "PHONE_TASK" ? "Call" : step.channel === "VOICEMAIL" ? "Leave voicemail for" : "Send letter to";
      await createTask(organizationId, systemUserId, {
        title: `${label} ${lead.contact.firstName} ${lead.contact.lastName}`,
        description: step.templateBody || undefined,
        leadId,
        assignedUserId: lead.assignedUserId ?? "",
        priority: "MEDIUM",
        dueAt: new Date().toISOString().slice(0, 10),
      });
    }
  } catch (err) {
    console.error(`[campaigns] step execution failed for lead ${leadId}:`, err);
  }
}
