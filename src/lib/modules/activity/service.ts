import "server-only";
import { prisma } from "@/lib/db";

export type ActivityEvent =
  | { kind: "stage_change"; at: Date; toStageName: string; fromStageName: string | null }
  | { kind: "note"; at: Date; body: string; authorName: string }
  | { kind: "task_created"; at: Date; title: string; assignedToName: string | null }
  | { kind: "task_completed"; at: Date; title: string }
  | { kind: "appointment_scheduled"; at: Date; appointmentType: string; startAt: Date }
  | { kind: "call"; at: Date; direction: "INBOUND" | "OUTBOUND"; disposition: string | null }
  | { kind: "sms"; at: Date; direction: "INBOUND" | "OUTBOUND"; body: string }
  | { kind: "email"; at: Date; direction: "INBOUND" | "OUTBOUND"; subject: string | null };

/**
 * Merges every activity type currently wired (source spec §4 lists Offers/Documents/Automations
 * too — those join this feed as their phases ship: Phase 7, 7, 6 respectively). Sorted newest
 * first.
 */
export async function getLeadActivityTimeline(organizationId: string, leadId: string): Promise<ActivityEvent[]> {
  const lead = await prisma.lead.findFirst({ where: { id: leadId, organizationId }, select: { pipelineId: true } });
  if (!lead) return [];

  // LeadStageHistory stores scalar fromStageId/toStageId (see docs/02-database-erd.md's rationale
  // for plain FK columns on detail tables) rather than a formal relation, so stage names are
  // resolved via this one lookup instead of an `include`.
  const stages = await prisma.pipelineStage.findMany({
    where: { pipelineId: lead.pipelineId },
    select: { id: true, name: true },
  });
  const stageNameById = new Map(stages.map((s) => [s.id, s.name]));

  const [stageHistory, notes, tasks, appointments, calls, smsMessages, emails] = await Promise.all([
    prisma.leadStageHistory.findMany({
      where: { leadId },
      orderBy: { changedAt: "desc" },
    }),
    prisma.note.findMany({
      where: { organizationId, leadId },
      include: { author: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.task.findMany({
      where: { organizationId, leadId },
      include: { assignedUser: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.appointment.findMany({
      where: { organizationId, leadId, cancelledAt: null },
      orderBy: { createdAt: "desc" },
    }),
    prisma.call.findMany({ where: { organizationId, leadId }, orderBy: { createdAt: "desc" } }),
    prisma.smsMessage.findMany({ where: { organizationId, leadId }, orderBy: { createdAt: "desc" } }),
    prisma.email.findMany({ where: { organizationId, leadId }, orderBy: { createdAt: "desc" } }),
  ]);

  const events: ActivityEvent[] = [];

  for (const h of stageHistory) {
    events.push({
      kind: "stage_change",
      at: h.changedAt,
      toStageName: stageNameById.get(h.toStageId) ?? "Unknown stage",
      fromStageName: h.fromStageId ? (stageNameById.get(h.fromStageId) ?? null) : null,
    });
  }
  for (const n of notes) {
    events.push({ kind: "note", at: n.createdAt, body: n.body, authorName: n.author.name });
  }
  for (const t of tasks) {
    events.push({
      kind: "task_created",
      at: t.createdAt,
      title: t.title,
      assignedToName: t.assignedUser?.name ?? null,
    });
    if (t.completedAt) {
      events.push({ kind: "task_completed", at: t.completedAt, title: t.title });
    }
  }
  for (const a of appointments) {
    events.push({ kind: "appointment_scheduled", at: a.createdAt, appointmentType: a.type, startAt: a.startAt });
  }
  for (const c of calls) {
    events.push({ kind: "call", at: c.createdAt, direction: c.direction, disposition: c.disposition });
  }
  for (const s of smsMessages) {
    events.push({ kind: "sms", at: s.createdAt, direction: s.direction, body: s.body });
  }
  for (const e of emails) {
    events.push({ kind: "email", at: e.createdAt, direction: e.direction, subject: e.subject });
  }

  return events.sort((a, b) => b.at.getTime() - a.at.getTime());
}
