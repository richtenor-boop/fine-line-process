import "server-only";
import { prisma } from "@/lib/db";
import type { ImportRow, ImportRowResult, DuplicateStrategy } from "./schema";
import type { LeadMotivation } from "@prisma/client";

function resolveName(row: ImportRow): { firstName: string; lastName: string } | null {
  if (row.firstName?.trim() && row.lastName?.trim()) {
    return { firstName: row.firstName.trim(), lastName: row.lastName.trim() };
  }
  const full = row.fullName?.trim();
  if (full) {
    const parts = full.split(/\s+/);
    return { firstName: parts[0], lastName: parts.slice(1).join(" ") || parts[0] };
  }
  if (row.lastName?.trim()) return { firstName: "Unknown", lastName: row.lastName.trim() };
  return null;
}

function resolveMotivation(raw?: string): LeadMotivation {
  const normalized = raw?.trim().toUpperCase();
  if (normalized === "LOW" || normalized === "MEDIUM" || normalized === "HIGH") return normalized;
  return "UNKNOWN";
}

/**
 * Validates and inserts one batch of already-mapped CSV rows (see src/lib/modules/imports/schema.ts).
 * Never throws on a bad individual row — collects a per-row result instead, so the caller (the
 * import wizard) can show a full error report rather than aborting the whole file on row 1's typo.
 */
export async function importLeadsBatch(
  organizationId: string,
  createdById: string,
  rows: ImportRow[],
  rowIndexOffset: number,
  duplicateStrategy: DuplicateStrategy,
): Promise<ImportRowResult[]> {
  const pipeline = await prisma.pipeline.findFirst({
    where: { organizationId, isDefault: true },
    include: { stages: { orderBy: { order: "asc" }, take: 1 } },
  });
  if (!pipeline || pipeline.stages.length === 0) {
    return rows.map((_, i) => ({
      rowIndex: rowIndexOffset + i,
      status: "error",
      reason: "Organization has no default pipeline configured.",
    }));
  }
  const stageId = pipeline.stages[0].id;

  const results: ImportRowResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowIndex = rowIndexOffset + i;

    const name = resolveName(row);
    if (!name) {
      results.push({ rowIndex, status: "error", reason: "Missing a name (map Full Name, or First + Last Name)." });
      continue;
    }

    const hasAnyAddressField = row.addressLine1 || row.city || row.state || row.zip;
    const hasFullAddress = row.addressLine1 && row.city && row.state && row.zip;
    if (hasAnyAddressField && !hasFullAddress) {
      results.push({
        rowIndex,
        status: "error",
        reason: "Incomplete property address — map Address, City, State, and ZIP together, or none.",
      });
      continue;
    }

    const email = row.email?.trim().toLowerCase() || undefined;
    const phone = row.phone?.trim() || undefined;

    try {
      let duplicateContactId: string | undefined;
      if (email || phone) {
        const existing = await prisma.contact.findFirst({
          where: {
            organizationId,
            deletedAt: null,
            OR: [
              ...(email ? [{ emailAddresses: { some: { email } } }] : []),
              ...(phone ? [{ phoneNumbers: { some: { number: phone } } }] : []),
            ],
          },
          select: { id: true },
        });
        duplicateContactId = existing?.id;
      }

      if (duplicateContactId && duplicateStrategy === "skip") {
        results.push({ rowIndex, status: "skipped_duplicate", reason: "Matching email or phone already exists." });
        continue;
      }

      await prisma.$transaction(async (tx) => {
        let contactId = duplicateContactId;
        if (!contactId) {
          const contact = await tx.contact.create({
            data: {
              organizationId,
              firstName: name.firstName,
              lastName: name.lastName,
              type: "SELLER",
              createdById,
              phoneNumbers: phone ? { create: [{ organizationId, number: phone, isPrimary: true }] } : undefined,
              emailAddresses: email ? { create: [{ organizationId, email, isPrimary: true }] } : undefined,
            },
          });
          contactId = contact.id;
        }

        let propertyId: string | undefined;
        if (hasFullAddress) {
          const property = await tx.property.create({
            data: {
              organizationId,
              addressLine1: row.addressLine1!.trim(),
              city: row.city!.trim(),
              county: row.county?.trim() || null,
              state: row.state!.trim().toUpperCase().slice(0, 2),
              zip: row.zip!.trim(),
              createdById,
            },
          });
          propertyId = property.id;
          await tx.propertyOwner.create({
            data: { organizationId, propertyId, contactId: contactId!, ownershipType: "SOLE" },
          });
        }

        let leadSourceId: string | undefined;
        if (row.leadSourceName?.trim()) {
          const trimmed = row.leadSourceName.trim();
          const existingSource = await tx.leadSource.findFirst({ where: { organizationId, name: trimmed } });
          leadSourceId = existingSource
            ? existingSource.id
            : (await tx.leadSource.create({ data: { organizationId, name: trimmed } })).id;
        }

        const askingPrice = row.askingPrice ? Number(row.askingPrice.replace(/[^0-9.]/g, "")) : undefined;

        const lead = await tx.lead.create({
          data: {
            organizationId,
            contactId: contactId!,
            propertyId,
            pipelineId: pipeline.id,
            stageId,
            motivation: resolveMotivation(row.motivation),
            timeline: row.timeline?.trim() || null,
            askingPrice: Number.isFinite(askingPrice) ? askingPrice : null,
            leadSourceId,
            createdById,
          },
        });
        await tx.leadStageHistory.create({ data: { leadId: lead.id, toStageId: stageId, changedById: createdById } });

        if (row.tags?.trim()) {
          for (const tagName of row.tags.split(",").map((t) => t.trim()).filter(Boolean)) {
            const tag = await tx.tag.upsert({
              where: { organizationId_name: { organizationId, name: tagName } },
              update: {},
              create: { organizationId, name: tagName },
            });
            await tx.tagAssignment.create({ data: { tagId: tag.id, leadId: lead.id } });
          }
        }
      });

      results.push({ rowIndex, status: "created" });
    } catch (err) {
      results.push({ rowIndex, status: "error", reason: err instanceof Error ? err.message : "Unknown error." });
    }
  }

  return results;
}
