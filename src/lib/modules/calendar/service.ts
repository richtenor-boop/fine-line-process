import "server-only";
import { prisma } from "@/lib/db";

export interface CalendarEvent {
  date: Date;
  kind: "appointment" | "task" | "closing" | "auction";
  label: string;
  href: string;
}

/**
 * Merges everything with a date that the org cares about seeing on a calendar (source spec §18):
 * Appointments, Task due dates, Deal closing dates, and Auction dates (Phase 9's `Auction` table).
 * `Foreclosure.auctionDate` isn't included separately — it's the same real-world event as the
 * `Auction` row created for that property, so surfacing both would double-plot it; a Foreclosure
 * case without a matching `Auction` row simply hasn't had one logged yet. Two-way external sync
 * (Google/Microsoft Calendar) remains a documented future integration (docs/06-integrations.md).
 */
export async function getCalendarEvents(organizationId: string, monthStart: Date, monthEnd: Date): Promise<CalendarEvent[]> {
  const [appointments, tasks, deals, auctions] = await Promise.all([
    prisma.appointment.findMany({
      where: { organizationId, cancelledAt: null, startAt: { gte: monthStart, lte: monthEnd } },
      include: { lead: { include: { contact: true } } },
    }),
    prisma.task.findMany({
      where: { organizationId, dueAt: { gte: monthStart, lte: monthEnd }, status: { in: ["OPEN", "IN_PROGRESS"] } },
    }),
    prisma.deal.findMany({
      where: { organizationId, deletedAt: null, closingDate: { gte: monthStart, lte: monthEnd } },
      include: { property: true },
    }),
    prisma.auction.findMany({
      where: { organizationId, auctionDate: { gte: monthStart, lte: monthEnd } },
      include: { property: true },
    }),
  ]);

  const events: CalendarEvent[] = [];
  for (const a of appointments) {
    events.push({
      date: a.startAt,
      kind: "appointment",
      label: `${a.type.replace(/_/g, " ")} — ${a.lead?.contact.firstName ?? ""} ${a.lead?.contact.lastName ?? ""}`.trim(),
      href: a.leadId ? `/leads/${a.leadId}` : "/calendar",
    });
  }
  for (const t of tasks) {
    events.push({ date: t.dueAt!, kind: "task", label: t.title, href: "/tasks" });
  }
  for (const d of deals) {
    events.push({
      date: d.closingDate!,
      kind: "closing",
      label: `Closing — ${d.property?.addressLine1 ?? "Deal"}`,
      href: `/deals/${d.id}`,
    });
  }
  for (const auction of auctions) {
    events.push({
      date: auction.auctionDate,
      kind: "auction",
      label: `Auction — ${auction.property?.addressLine1 ?? "Property"}`,
      href: `/properties/${auction.propertyId}`,
    });
  }

  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
}
