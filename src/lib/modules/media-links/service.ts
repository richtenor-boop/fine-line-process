import "server-only";
import { prisma } from "@/lib/db";
import { describeHost, type CreateMediaLinkInput } from "./schema";

export async function listMediaLinks(organizationId: string, scope: { propertyId?: string; leadId?: string }) {
  return prisma.mediaLink.findMany({
    where: {
      organizationId,
      ...(scope.propertyId ? { propertyId: scope.propertyId } : {}),
      ...(scope.leadId ? { leadId: scope.leadId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createMediaLink(organizationId: string, userId: string, input: CreateMediaLinkInput) {
  if (input.propertyId) {
    const p = await prisma.property.findFirst({ where: { id: input.propertyId, organizationId }, select: { id: true } });
    if (!p) throw new Error("Property not found.");
  }
  if (input.leadId) {
    const l = await prisma.lead.findFirst({ where: { id: input.leadId, organizationId }, select: { id: true } });
    if (!l) throw new Error("Lead not found.");
  }
  return prisma.mediaLink.create({
    data: {
      organizationId,
      propertyId: input.propertyId || null,
      leadId: input.leadId || null,
      kind: input.kind,
      label: input.label || describeHost(input.url),
      url: input.url,
      createdById: userId,
    },
  });
}

export async function deleteMediaLink(organizationId: string, linkId: string) {
  await prisma.mediaLink.deleteMany({ where: { id: linkId, organizationId } });
}
