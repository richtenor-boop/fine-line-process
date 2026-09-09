import "server-only";
import { prisma } from "@/lib/db";

export async function listTags(organizationId: string) {
  return prisma.tag.findMany({
    where: { organizationId },
    include: { _count: { select: { leadTags: true } } },
    orderBy: { name: "asc" },
  });
}

export async function findOrCreateTag(organizationId: string, name: string, color?: string) {
  const trimmed = name.trim();
  const existing = await prisma.tag.findFirst({ where: { organizationId, name: trimmed } });
  if (existing) return existing;
  return prisma.tag.create({ data: { organizationId, name: trimmed, color: color || null } });
}

export async function deleteTag(organizationId: string, tagId: string) {
  const tag = await prisma.tag.findFirst({ where: { id: tagId, organizationId } });
  if (!tag) throw new Error("Tag does not belong to this organization.");
  await prisma.tag.delete({ where: { id: tagId } });
}

export async function assignTagToLead(organizationId: string, leadId: string, tagName: string) {
  const lead = await prisma.lead.findFirst({ where: { id: leadId, organizationId } });
  if (!lead) throw new Error("Lead does not belong to this organization.");

  const tag = await findOrCreateTag(organizationId, tagName);
  // Not a Prisma `upsert`: the (tagId, leadId, contactId) compound unique has a nullable member,
  // so Prisma's generated WhereUniqueInput won't accept `contactId: null` there, and Postgres
  // itself treats NULL as distinct in unique indexes anyway — this read-then-write is a
  // best-effort dedup, not DB-enforced. Acceptable for Phase 2 (a race just assigns the same tag
  // twice, which is harmless); a partial unique index (`WHERE contact_id IS NULL`) would close
  // this if it ever matters.
  const existing = await prisma.tagAssignment.findFirst({ where: { tagId: tag.id, leadId } });
  if (existing) return existing;
  return prisma.tagAssignment.create({ data: { tagId: tag.id, leadId } });
}

export async function removeTagFromLead(organizationId: string, leadId: string, tagId: string) {
  const lead = await prisma.lead.findFirst({ where: { id: leadId, organizationId } });
  if (!lead) throw new Error("Lead does not belong to this organization.");
  await prisma.tagAssignment.deleteMany({ where: { leadId, tagId } });
}
