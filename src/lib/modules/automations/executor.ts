import "server-only";
import { prisma } from "@/lib/db";
import { sendSms, sendEmail } from "@/lib/modules/communications/service";
import { createTask } from "@/lib/modules/tasks/service";
import { createNotification } from "@/lib/modules/notifications/service";
import { enrollLead, stopEnrollment } from "@/lib/modules/campaigns/service";
import { sendConfiguredWebhook } from "@/lib/modules/webhooks/service";
import { summarizeLeadActivityToNote } from "@/lib/modules/ai/service";
import type { Condition } from "./schema";
import type { SupportedTriggerType } from "./schema";

/**
 * Loop-safety design: an automation action must never call a service function that itself calls
 * `runAutomationsForTrigger` (that would let automation A's action re-fire automation B's trigger,
 * which could re-fire A's, forever). CHANGE_STAGE / ADD_TAG / REMOVE_TAG / CREATE_APPOINTMENT
 * therefore perform raw Prisma writes here instead of calling changeLeadStage() / assignTagToLead()
 * / createAppointment() — those are the only functions that fire triggers. Everything else
 * (sendSms, sendEmail, createTask, createNotification, campaign enroll/stop, webhook send) is a
 * true leaf with no trigger of its own, so calling the real service is safe. A depth guard is kept
 * anyway as defense-in-depth against a future contributor reintroducing a cycle.
 */
const MAX_TRIGGER_DEPTH = 3;

interface LeadContext {
  id: string;
  organizationId: string;
  pipelineId: string;
  stageId: string;
  motivation: string;
  assignedUserId: string | null;
  contactId: string;
  contactPhoneId: string | null;
  contactEmailId: string | null;
  propertyState: string | null;
  propertyEquity: number | null;
  tagNames: Set<string>;
}

async function loadLeadContext(organizationId: string, leadId: string): Promise<LeadContext | null> {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId },
    include: {
      contact: { include: { phoneNumbers: true, emailAddresses: true } },
      property: true,
      tags: { include: { tag: true } },
    },
  });
  if (!lead) return null;

  return {
    id: lead.id,
    organizationId,
    pipelineId: lead.pipelineId,
    stageId: lead.stageId,
    motivation: lead.motivation,
    assignedUserId: lead.assignedUserId,
    contactId: lead.contactId,
    contactPhoneId: lead.contact.phoneNumbers.find((p) => p.isPrimary)?.id ?? lead.contact.phoneNumbers[0]?.id ?? null,
    contactEmailId: lead.contact.emailAddresses.find((e) => e.isPrimary)?.id ?? lead.contact.emailAddresses[0]?.id ?? null,
    propertyState: lead.property?.state ?? null,
    propertyEquity: lead.property?.estimatedEquity ? Number(lead.property.estimatedEquity) : null,
    tagNames: new Set(lead.tags.map((t) => t.tag.name.toLowerCase())),
  };
}

function evaluateCondition(condition: Condition | null, ctx: LeadContext): boolean {
  if (!condition) return true;
  switch (condition.field) {
    case "motivation":
      return ctx.motivation === condition.value.toUpperCase();
    case "stageId":
      return ctx.stageId === condition.value;
    case "assignedUserId":
      return ctx.assignedUserId === condition.value;
    case "tag":
      return ctx.tagNames.has(condition.value.toLowerCase());
    case "state":
      return ctx.propertyState === condition.value.toUpperCase();
    case "minEquity":
      return ctx.propertyEquity !== null && ctx.propertyEquity >= Number(condition.value);
  }
}

async function executeStep(
  actionType: string,
  actionConfig: Record<string, unknown>,
  ctx: LeadContext,
  automationCreatedById: string | null,
) {
  const cfg = actionConfig as Record<string, string | number | undefined>;

  switch (actionType) {
    case "SEND_SMS":
      if (ctx.contactPhoneId && cfg.body) {
        await sendSms(ctx.organizationId, "system", { leadId: ctx.id, phoneNumberId: ctx.contactPhoneId, body: String(cfg.body) });
      }
      break;

    case "SEND_EMAIL":
      if (ctx.contactEmailId && cfg.subject) {
        await sendEmail(ctx.organizationId, "system", {
          leadId: ctx.id,
          emailAddressId: ctx.contactEmailId,
          subject: String(cfg.subject),
          bodyHtml: String(cfg.bodyHtml ?? ""),
        });
      }
      break;

    case "CREATE_TASK":
      if (cfg.title) {
        const dueInDays = Number(cfg.dueInDays ?? 0);
        const dueAt = dueInDays > 0 ? new Date(Date.now() + dueInDays * 86400000).toISOString() : "";
        await createTask(ctx.organizationId, "system", {
          title: String(cfg.title),
          leadId: ctx.id,
          assignedUserId: cfg.assignedUserId ? String(cfg.assignedUserId) : "",
          priority: "MEDIUM",
          dueAt,
        });
      }
      break;

    case "ASSIGN_USER":
      if (cfg.userId) {
        await prisma.lead.update({ where: { id: ctx.id }, data: { assignedUserId: String(cfg.userId) } });
      }
      break;

    case "CHANGE_STAGE": {
      // Raw write, not changeLeadStage() — see loop-safety note above.
      if (cfg.stageId) {
        const stage = await prisma.pipelineStage.findFirst({ where: { id: String(cfg.stageId), pipelineId: ctx.pipelineId } });
        if (stage) {
          await prisma.lead.update({ where: { id: ctx.id }, data: { stageId: stage.id } });
          await prisma.leadStageHistory.create({ data: { leadId: ctx.id, fromStageId: ctx.stageId, toStageId: stage.id } });
        }
      }
      break;
    }

    case "ADD_TAG":
    case "REMOVE_TAG": {
      // Raw write, not assignTagToLead() — see loop-safety note above.
      if (cfg.tagName) {
        const name = String(cfg.tagName).trim();
        const tag = await prisma.tag.findFirst({ where: { organizationId: ctx.organizationId, name } });
        if (actionType === "ADD_TAG") {
          const resolvedTag = tag ?? (await prisma.tag.create({ data: { organizationId: ctx.organizationId, name } }));
          const exists = await prisma.tagAssignment.findFirst({ where: { tagId: resolvedTag.id, leadId: ctx.id } });
          if (!exists) await prisma.tagAssignment.create({ data: { tagId: resolvedTag.id, leadId: ctx.id } });
        } else if (tag) {
          await prisma.tagAssignment.deleteMany({ where: { tagId: tag.id, leadId: ctx.id } });
        }
      }
      break;
    }

    case "CREATE_NOTIFICATION":
      if (cfg.title) {
        const userId = cfg.userId ? String(cfg.userId) : ctx.assignedUserId;
        if (userId) {
          await createNotification(ctx.organizationId, {
            userId,
            type: "automation",
            title: String(cfg.title),
            body: cfg.body ? String(cfg.body) : undefined,
            entityType: "Lead",
            entityId: ctx.id,
          });
        }
      }
      break;

    case "CREATE_APPOINTMENT": {
      // Raw write, not appointments/service.createAppointment() — see loop-safety note above.
      const daysFromNow = Number(cfg.daysFromNow ?? 1);
      const durationMinutes = Number(cfg.durationMinutes ?? 30);
      const startAt = new Date(Date.now() + daysFromNow * 86400000);
      const endAt = new Date(startAt.getTime() + durationMinutes * 60000);
      await prisma.appointment.create({
        data: {
          organizationId: ctx.organizationId,
          leadId: ctx.id,
          type: (cfg.type as never) ?? "CONSULTATION",
          startAt,
          endAt,
          assignedUserId: ctx.assignedUserId,
        },
      });
      break;
    }

    case "START_CAMPAIGN":
      if (cfg.campaignId) await enrollLead(ctx.organizationId, String(cfg.campaignId), ctx.id);
      break;

    case "STOP_CAMPAIGN":
      if (cfg.campaignId) await stopEnrollment(ctx.organizationId, String(cfg.campaignId), ctx.id, "Stopped by automation");
      break;

    case "SEND_WEBHOOK":
      if (cfg.webhookId) {
        await sendConfiguredWebhook(ctx.organizationId, String(cfg.webhookId), { leadId: ctx.id });
      }
      break;

    case "GENERATE_AI_SUMMARY": {
      // Advisory only, like every AI feature (source spec §19) — writes a Note a human reads,
      // never an action another automation could react to. Attributed to whoever set the
      // automation up (falling back to the lead's assignee) since Note.authorUserId is a real
      // FK, not a "system" sentinel.
      const authorUserId = automationCreatedById ?? ctx.assignedUserId;
      if (authorUserId) {
        await summarizeLeadActivityToNote(ctx.organizationId, ctx.id, authorUserId);
      }
      break;
    }
  }
}

export async function runAutomationsForTrigger(
  organizationId: string,
  triggerType: SupportedTriggerType,
  leadId: string,
  depth = 0,
) {
  if (depth >= MAX_TRIGGER_DEPTH) return;

  const automations = await prisma.automation.findMany({
    where: { organizationId, triggerType, isActive: true },
    include: { steps: { orderBy: { order: "asc" } } },
  });
  if (automations.length === 0) return;

  const ctx = await loadLeadContext(organizationId, leadId);
  if (!ctx) return;

  for (const automation of automations) {
    for (const step of automation.steps) {
      const condition = (step.conditionJson as Condition | null) ?? null;
      if (!evaluateCondition(condition, ctx)) continue;

      try {
        await executeStep(step.actionType, step.actionConfig as Record<string, unknown>, ctx, automation.createdById);
      } catch (err) {
        console.error(`[automations] step failed (automation=${automation.id}, step=${step.id}):`, err);
      }
    }
  }
}
