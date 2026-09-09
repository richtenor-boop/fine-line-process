import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma, PropertyType } from "@prisma/client";
import type { CreateLeadInput, UpdateLeadDetailsInput } from "./schema";

async function getDefaultPipelineStage(organizationId: string) {
  const pipeline = await prisma.pipeline.findFirst({
    where: { organizationId, isDefault: true },
    include: { stages: { orderBy: { order: "asc" }, take: 1 } },
  });
  if (!pipeline || pipeline.stages.length === 0) {
    throw new Error("This organization has no default pipeline configured.");
  }
  return { pipelineId: pipeline.id, stageId: pipeline.stages[0].id };
}

export async function createLead(organizationId: string, input: CreateLeadInput, createdById: string) {
  const { pipelineId, stageId } = await getDefaultPipelineStage(organizationId);

  return prisma.$transaction(async (tx) => {
    let contactId = input.contactId;
    if (input.contactMode === "new") {
      const contact = await tx.contact.create({
        data: {
          organizationId,
          firstName: input.firstName!,
          lastName: input.lastName!,
          type: "SELLER",
          createdById,
          phoneNumbers: input.phone ? { create: [{ organizationId, number: input.phone, isPrimary: true }] } : undefined,
          emailAddresses: input.email
            ? { create: [{ organizationId, email: input.email.toLowerCase(), isPrimary: true }] }
            : undefined,
        },
      });
      contactId = contact.id;
    }
    if (!contactId) throw new Error("A contact is required to create a lead.");

    let propertyId: string | undefined = input.propertyMode === "existing" ? input.propertyId : undefined;
    if (input.propertyMode === "new") {
      const property = await tx.property.create({
        data: {
          organizationId,
          addressLine1: input.addressLine1!,
          city: input.city!,
          state: input.state!.toUpperCase(),
          zip: input.zip!,
          createdById,
        },
      });
      propertyId = property.id;
      await tx.propertyOwner.create({
        data: { organizationId, propertyId: property.id, contactId, ownershipType: "SOLE" },
      });
    } else if (input.propertyMode === "existing" && propertyId) {
      const alreadyOwner = await tx.propertyOwner.findFirst({ where: { propertyId, contactId } });
      if (!alreadyOwner) {
        await tx.propertyOwner.create({
          data: { organizationId, propertyId, contactId, ownershipType: "SOLE" },
        });
      }
    }

    let leadSourceId: string | null = null;
    if (input.leadSourceName) {
      const trimmed = input.leadSourceName.trim();
      const existingSource = await tx.leadSource.findFirst({ where: { organizationId, name: trimmed } });
      leadSourceId = existingSource
        ? existingSource.id
        : (await tx.leadSource.create({ data: { organizationId, name: trimmed } })).id;
    }

    const lead = await tx.lead.create({
      data: {
        organizationId,
        contactId,
        propertyId,
        pipelineId,
        stageId,
        leadSourceId,
        assignedUserId: input.assignedUserId || null,
        motivation: input.motivation,
        timeline: input.timeline || null,
        askingPrice: input.askingPrice ?? null,
        createdById,
      },
    });

    await tx.leadStageHistory.create({
      data: { leadId: lead.id, toStageId: stageId, changedById: createdById },
    });

    return lead;
  });
}

export async function getLead(organizationId: string, leadId: string) {
  return prisma.lead.findFirst({
    where: { id: leadId, organizationId, deletedAt: null },
    include: {
      contact: { include: { phoneNumbers: true, emailAddresses: true } },
      property: true,
      pipeline: { include: { stages: { orderBy: { order: "asc" } } } },
      stage: true,
      assignedUser: true,
      leadSource: true,
      tags: { include: { tag: true } },
      notes: { include: { author: true }, orderBy: { createdAt: "desc" } },
      stageHistory: { orderBy: { changedAt: "desc" } },
      customFieldValues: { include: { definition: true } },
    },
  });
}

export interface ListLeadsFilters {
  assignedUserId?: string;
  stageId?: string;
  leadSourceId?: string;
  tagId?: string;
  motivation?: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  state?: string;
  county?: string;
  city?: string;
  zip?: string;
  propertyType?: PropertyType;
  minEquity?: number;
}

// Source spec §13's filter list (State, County, City, ZIP, Property Type, Equity, Lead Source,
// Lead Status, Tags, Assigned User) — Foreclosure/Probate/Tax Sale/Surplus filters wait for
// Phase 9's detail tables to have any application code operating on them.
export async function listLeads(organizationId: string, filters: ListLeadsFilters = {}) {
  const propertyWhere: Prisma.PropertyWhereInput = {};
  if (filters.state) propertyWhere.state = filters.state.toUpperCase();
  if (filters.county) propertyWhere.county = { contains: filters.county, mode: "insensitive" };
  if (filters.city) propertyWhere.city = { contains: filters.city, mode: "insensitive" };
  if (filters.zip) propertyWhere.zip = filters.zip;
  if (filters.propertyType) propertyWhere.propertyType = filters.propertyType;
  if (filters.minEquity !== undefined) propertyWhere.estimatedEquity = { gte: filters.minEquity };
  const hasPropertyFilter = Object.keys(propertyWhere).length > 0;

  return prisma.lead.findMany({
    where: {
      organizationId,
      deletedAt: null,
      ...(filters.assignedUserId ? { assignedUserId: filters.assignedUserId } : {}),
      ...(filters.stageId ? { stageId: filters.stageId } : {}),
      ...(filters.leadSourceId ? { leadSourceId: filters.leadSourceId } : {}),
      ...(filters.motivation ? { motivation: filters.motivation } : {}),
      ...(filters.tagId ? { tags: { some: { tagId: filters.tagId } } } : {}),
      ...(hasPropertyFilter ? { property: propertyWhere } : {}),
    },
    include: {
      contact: true,
      property: true,
      stage: true,
      assignedUser: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function updateLeadDetails(organizationId: string, leadId: string, data: UpdateLeadDetailsInput) {
  return prisma.lead.update({
    where: { id: leadId, organizationId },
    data: {
      motivation: data.motivation,
      timeline: data.timeline || null,
      askingPrice: data.askingPrice ?? null,
      offerAmount: data.offerAmount ?? null,
      nextFollowUpAt: data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : null,
    },
  });
}

export async function assignLead(organizationId: string, leadId: string, assignedUserId: string | null) {
  if (assignedUserId) {
    const user = await prisma.user.findFirst({ where: { id: assignedUserId, organizationId } });
    if (!user) throw new Error("User does not belong to this organization.");
  }
  return prisma.lead.update({ where: { id: leadId, organizationId }, data: { assignedUserId } });
}

export async function changeLeadStage(organizationId: string, leadId: string, stageId: string, changedById: string) {
  const lead = await prisma.lead.findFirst({ where: { id: leadId, organizationId } });
  if (!lead) throw new Error("Lead does not belong to this organization.");

  const stage = await prisma.pipelineStage.findFirst({ where: { id: stageId, pipelineId: lead.pipelineId } });
  if (!stage) throw new Error("Stage does not belong to this lead's pipeline.");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.lead.update({ where: { id: leadId }, data: { stageId } });
    await tx.leadStageHistory.create({
      data: { leadId, fromStageId: lead.stageId, toStageId: stageId, changedById },
    });
    return updated;
  });
}

export async function softDeleteLead(organizationId: string, leadId: string) {
  await prisma.lead.update({ where: { id: leadId, organizationId }, data: { deletedAt: new Date() } });
}

/** Date math lives here, not in the calling Server Component's render body — see
 * https://react.dev/reference/rules/components-and-hooks-must-be-pure (Date.now() is impure). */
export async function countNewLeadsInLastDays(organizationId: string, days: number) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return prisma.lead.count({ where: { organizationId, deletedAt: null, createdAt: { gte: since } } });
}
