import "server-only";
import { prisma } from "@/lib/db";
import { getAiProvider } from "@/lib/integrations/ai";
import { listCommunicationsForLead } from "@/lib/modules/communications/service";
import { getLeadActivityTimeline } from "@/lib/modules/activity/service";
import type { LeadScoreResult } from "@/lib/integrations/ai/types";

async function buildLeadScoreInput(organizationId: string, leadId: string) {
  const lead = await prisma.lead.findFirstOrThrow({
    where: { id: leadId, organizationId },
    include: {
      property: true,
      tags: { include: { tag: true } },
      notes: { orderBy: { createdAt: "desc" }, take: 5 },
      appointments: { where: { cancelledAt: null, startAt: { gte: new Date() } } },
      tasks: { where: { status: { in: ["OPEN", "IN_PROGRESS"] } } },
    },
  });

  return {
    motivation: lead.motivation,
    timeline: lead.timeline,
    askingPrice: lead.askingPrice ? Number(lead.askingPrice) : null,
    daysSinceCreated: Math.floor((Date.now() - lead.createdAt.getTime()) / 86400000),
    hasUpcomingAppointment: lead.appointments.length > 0,
    openTaskCount: lead.tasks.length,
    propertyEquity: lead.property?.estimatedEquity ? Number(lead.property.estimatedEquity) : null,
    tagNames: lead.tags.map((t) => t.tag.name),
    recentNoteBodies: lead.notes.map((n) => n.body),
  };
}

/** Formats the score + reasons + recommended action into the single `Lead.aiScoreReason` text
 * field, matching the exact worked example format from source spec §19. */
function formatScoreReason(result: LeadScoreResult): string {
  return [
    `Motivation: ${result.motivationLabel}`,
    "Reason:",
    ...result.reasons.map((r) => `- ${r}`),
    "",
    `Recommended Action: ${result.recommendedAction}`,
  ].join("\n");
}

export async function scoreLead(organizationId: string, leadId: string) {
  const input = await buildLeadScoreInput(organizationId, leadId);
  const result = await getAiProvider().scoreLead(input);

  await prisma.lead.update({
    where: { id: leadId, organizationId },
    data: { aiScore: result.score, aiScoreReason: formatScoreReason(result) },
  });

  return result;
}

export async function summarizeLeadConversation(organizationId: string, leadId: string) {
  const lead = await prisma.lead.findFirstOrThrow({
    where: { id: leadId, organizationId },
    include: { contact: true },
  });
  const events = await listCommunicationsForLead(organizationId, leadId);

  const transcriptLines = [...events].reverse().map((e) => e.summary);
  const result = await getAiProvider().summarize({
    transcriptLines,
    context: `Communication thread with ${lead.contact.firstName} ${lead.contact.lastName}`,
  });
  return result.summary;
}

/** Used by the Automations "Generate AI Summary" action — summarizes recent activity (not just
 * messages) into a Note, since an automation has no UI to display an ephemeral result to. */
export async function summarizeLeadActivityToNote(organizationId: string, leadId: string, authorUserId: string) {
  const lead = await prisma.lead.findFirstOrThrow({ where: { id: leadId, organizationId }, include: { contact: true } });
  const timeline = await getLeadActivityTimeline(organizationId, leadId);

  const lines = [...timeline].reverse().map((e) => `[${e.at.toLocaleDateString()}] ${describeForSummary(e)}`);
  const result = await getAiProvider().summarize({
    transcriptLines: lines,
    context: `Recent activity for ${lead.contact.firstName} ${lead.contact.lastName}`,
  });

  return prisma.note.create({
    data: { organizationId, leadId, authorUserId, body: `AI Summary: ${result.summary}` },
  });
}

function describeForSummary(event: { kind: string; [key: string]: unknown }): string {
  switch (event.kind) {
    case "note":
      return `Note: ${event.body}`;
    case "stage_change":
      return `Stage changed to ${event.toStageName}`;
    case "sms":
      return `SMS: ${event.body}`;
    case "email":
      return `Email: ${event.subject}`;
    case "call":
      return `Call (${event.direction})${event.disposition ? ` — ${event.disposition}` : ""}`;
    case "task_created":
      return `Task created: ${event.title}`;
    case "task_completed":
      return `Task completed: ${event.title}`;
    case "appointment_scheduled":
      return `Appointment scheduled (${event.appointmentType})`;
    default:
      return event.kind;
  }
}
