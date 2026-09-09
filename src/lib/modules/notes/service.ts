import "server-only";
import { prisma } from "@/lib/db";
import type { CreateNoteInput } from "./schema";

export async function createNote(organizationId: string, authorUserId: string, input: CreateNoteInput) {
  if (!input.leadId && !input.propertyId && !input.dealId) {
    throw new Error("A note must be attached to a lead, property, or deal.");
  }
  return prisma.note.create({
    data: {
      organizationId,
      authorUserId,
      body: input.body,
      leadId: input.leadId ?? null,
      propertyId: input.propertyId ?? null,
      dealId: input.dealId ?? null,
    },
  });
}

export async function listNotesForLead(organizationId: string, leadId: string) {
  return prisma.note.findMany({
    where: { organizationId, leadId },
    include: { author: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function listNotesForProperty(organizationId: string, propertyId: string) {
  return prisma.note.findMany({
    where: { organizationId, propertyId },
    include: { author: true },
    orderBy: { createdAt: "desc" },
  });
}
