import "server-only";
import { prisma } from "@/lib/db";
import { sumMarketingCosts } from "@/lib/modules/marketing-costs/service";
import { getActivePipelineValue } from "@/lib/modules/deals/service";

interface DateRange {
  from: Date;
  to: Date;
}

export async function getLeadsBySource(organizationId: string, range: DateRange) {
  const leads = await prisma.lead.findMany({
    where: { organizationId, deletedAt: null, createdAt: { gte: range.from, lte: range.to } },
    include: { leadSource: true },
  });
  const counts = new Map<string, number>();
  for (const lead of leads) {
    const key = lead.leadSource?.name ?? "(No source)";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

export async function getLeadsByMarket(organizationId: string, range: DateRange) {
  const leads = await prisma.lead.findMany({
    where: { organizationId, deletedAt: null, createdAt: { gte: range.from, lte: range.to } },
    include: { property: true },
  });
  const counts = new Map<string, number>();
  for (const lead of leads) {
    const key = lead.property?.state ?? "(No property)";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

export async function getLeadsByUser(organizationId: string, range: DateRange) {
  const leads = await prisma.lead.findMany({
    where: { organizationId, deletedAt: null, createdAt: { gte: range.from, lte: range.to } },
    include: { assignedUser: true },
  });
  const counts = new Map<string, number>();
  for (const lead of leads) {
    const key = lead.assignedUser?.name ?? "Unassigned";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

export async function getAppointmentsReport(organizationId: string, range: DateRange) {
  return prisma.appointment.findMany({
    where: { organizationId, createdAt: { gte: range.from, lte: range.to } },
    include: { lead: { include: { contact: true } } },
    orderBy: { startAt: "asc" },
  });
}

export async function getOffersReport(organizationId: string, range: DateRange) {
  const offers = await prisma.offer.findMany({
    where: { organizationId, createdAt: { gte: range.from, lte: range.to } },
  });
  const byStatus = new Map<string, number>();
  for (const o of offers) byStatus.set(o.status, (byStatus.get(o.status) ?? 0) + 1);
  return { total: offers.length, byStatus: [...byStatus.entries()].map(([label, count]) => ({ label, count })) };
}

export async function getContractsReport(organizationId: string, range: DateRange) {
  const contracts = await prisma.contract.findMany({
    where: { organizationId, createdAt: { gte: range.from, lte: range.to } },
  });
  const byStatus = new Map<string, number>();
  for (const c of contracts) byStatus.set(c.status, (byStatus.get(c.status) ?? 0) + 1);
  return { total: contracts.length, byStatus: [...byStatus.entries()].map(([label, count]) => ({ label, count })) };
}

export async function getClosedDealsReport(organizationId: string, range: DateRange) {
  return prisma.deal.findMany({
    where: {
      organizationId,
      deletedAt: null,
      closedAt: { gte: range.from, lte: range.to },
      stage: { in: ["CLOSED_WON", "CLOSED_LOST"] },
    },
    include: { property: true, lead: { include: { contact: true } } },
    orderBy: { closedAt: "desc" },
  });
}

/**
 * Period-based volume ratios, not strict per-lead lineage tracking (a lead created near the end
 * of the range might convert after it) — an honest approximation, not overclaiming precision.
 */
export async function getConversionRates(organizationId: string, range: DateRange) {
  const where = { organizationId, createdAt: { gte: range.from, lte: range.to } };
  const [leads, appointments, offers, contracts, closedWon] = await Promise.all([
    prisma.lead.count({ where: { ...where, deletedAt: null } }),
    prisma.appointment.count({ where }),
    prisma.offer.count({ where }),
    prisma.contract.count({ where: { ...where, status: "SIGNED" } }),
    prisma.deal.count({ where: { organizationId, deletedAt: null, closedAt: { gte: range.from, lte: range.to }, stage: "CLOSED_WON" } }),
  ]);

  const rate = (numerator: number, denominator: number) => (denominator === 0 ? null : (numerator / denominator) * 100);

  return {
    leads,
    appointments,
    offers,
    contracts,
    closedWon,
    leadToAppointment: rate(appointments, leads),
    appointmentToOffer: rate(offers, appointments),
    offerToContract: rate(contracts, offers),
    contractToClosed: rate(closedWon, contracts),
    overallLeadToClosed: rate(closedWon, leads),
  };
}

export async function getFinancialsReport(organizationId: string, range: DateRange) {
  const [marketingSpend, newLeadsCount, newContractsCount, closedDeals, transactions, pipelineValue] = await Promise.all([
    sumMarketingCosts(organizationId, range.from, range.to),
    prisma.lead.count({ where: { organizationId, deletedAt: null, createdAt: { gte: range.from, lte: range.to } } }),
    prisma.contract.count({ where: { organizationId, createdAt: { gte: range.from, lte: range.to } } }),
    prisma.deal.count({
      where: { organizationId, deletedAt: null, closedAt: { gte: range.from, lte: range.to }, stage: "CLOSED_WON" },
    }),
    prisma.transaction.findMany({
      where: { organizationId, occurredOn: { gte: range.from, lte: range.to } },
    }),
    getActivePipelineValue(organizationId),
  ]);

  const revenue = transactions
    .filter((t) => t.type === "DISPOSITION_PROCEEDS" || t.type === "ASSIGNMENT_FEE")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const costs =
    transactions
      .filter((t) => t.type === "ACQUISITION_COST" || t.type === "REPAIR_COST" || t.type === "CLOSING_COST")
      .reduce((sum, t) => sum + Number(t.amount), 0) + marketingSpend;

  return {
    marketingSpend,
    costPerLead: newLeadsCount > 0 ? marketingSpend / newLeadsCount : null,
    costPerContract: newContractsCount > 0 ? marketingSpend / newContractsCount : null,
    costPerDeal: closedDeals > 0 ? marketingSpend / closedDeals : null,
    revenue,
    costs,
    profit: revenue - costs,
    pipelineValue, // as-of-now snapshot, not scoped to the date range
    newLeadsCount,
    newContractsCount,
    closedDeals,
  };
}

/** Median of a non-empty list; null for an empty one. */
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Speed to lead: minutes from a lead's creation to the first OUTBOUND call, SMS, or email logged
 * against it. Inbound messages don't count — the seller reaching out again isn't us responding.
 * Leads with no outbound touch yet are reported separately as "not yet contacted".
 */
export async function getSpeedToLeadReport(organizationId: string, range: DateRange) {
  const leads = await prisma.lead.findMany({
    where: { organizationId, deletedAt: null, createdAt: { gte: range.from, lte: range.to } },
    select: {
      id: true,
      createdAt: true,
      contact: { select: { firstName: true, lastName: true } },
      assignedUser: { select: { name: true } },
      calls: { where: { direction: "OUTBOUND" }, select: { createdAt: true }, orderBy: { createdAt: "asc" }, take: 1 },
      smsMessages: { where: { direction: "OUTBOUND" }, select: { createdAt: true }, orderBy: { createdAt: "asc" }, take: 1 },
      emails: { where: { direction: "OUTBOUND" }, select: { createdAt: true }, orderBy: { createdAt: "asc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  const responseMinutes: number[] = [];
  const byUser = new Map<string, number[]>();
  const notContacted: { id: string; name: string; assignee: string; createdAt: Date }[] = [];

  for (const lead of leads) {
    const touches = [lead.calls[0], lead.smsMessages[0], lead.emails[0]]
      .filter((t): t is { createdAt: Date } => !!t && t.createdAt >= lead.createdAt)
      .map((t) => t.createdAt.getTime());
    const assignee = lead.assignedUser?.name ?? "(Unassigned)";
    if (touches.length === 0) {
      notContacted.push({
        id: lead.id,
        name: `${lead.contact.firstName} ${lead.contact.lastName}`,
        assignee,
        createdAt: lead.createdAt,
      });
      continue;
    }
    const minutes = (Math.min(...touches) - lead.createdAt.getTime()) / 60000;
    responseMinutes.push(minutes);
    byUser.set(assignee, [...(byUser.get(assignee) ?? []), minutes]);
  }

  const pctWithin = (limitMinutes: number) =>
    leads.length > 0 ? (responseMinutes.filter((m) => m <= limitMinutes).length / leads.length) * 100 : null;

  return {
    totalLeads: leads.length,
    contactedLeads: responseMinutes.length,
    medianMinutes: median(responseMinutes),
    averageMinutes: responseMinutes.length > 0 ? responseMinutes.reduce((a, b) => a + b, 0) / responseMinutes.length : null,
    pctWithin5Minutes: pctWithin(5),
    pctWithin1Hour: pctWithin(60),
    byUser: [...byUser.entries()]
      .map(([label, mins]) => ({ label, contacted: mins.length, medianMinutes: median(mins) }))
      .sort((a, b) => (a.medianMinutes ?? Infinity) - (b.medianMinutes ?? Infinity)),
    notContacted: notContacted.slice(0, 25),
    notContactedCount: notContacted.length,
  };
}
