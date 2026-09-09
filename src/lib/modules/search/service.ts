import "server-only";
import { prisma } from "@/lib/db";

/**
 * Source spec §20: search across People, Phone Numbers, Emails, Property Addresses, Parcel
 * Numbers, Leads, Deals, Documents — all now covered as of Phase 7. Tolerates partial matches via
 * `contains`. `scope` lets the caller only search categories the current user actually has view
 * permission for.
 */
export async function globalSearch(
  organizationId: string,
  query: string,
  scope: { leads: boolean; properties: boolean; deals: boolean; documents: boolean },
) {
  const q = query.trim();
  if (q.length < 2) return { leads: [], properties: [], deals: [], documents: [] };

  const [leads, properties, deals, documents] = await Promise.all([
    scope.leads
      ? prisma.lead.findMany({
          where: {
            organizationId,
            deletedAt: null,
            OR: [
              { contact: { firstName: { contains: q, mode: "insensitive" } } },
              { contact: { lastName: { contains: q, mode: "insensitive" } } },
              { contact: { emailAddresses: { some: { email: { contains: q, mode: "insensitive" } } } } },
              { contact: { phoneNumbers: { some: { number: { contains: q } } } } },
              { property: { addressLine1: { contains: q, mode: "insensitive" } } },
              { property: { parcelNumber: { contains: q, mode: "insensitive" } } },
            ],
          },
          include: { contact: true, property: true, stage: true },
          take: 25,
        })
      : Promise.resolve([]),
    scope.properties
      ? prisma.property.findMany({
          where: {
            organizationId,
            deletedAt: null,
            OR: [
              { addressLine1: { contains: q, mode: "insensitive" } },
              { parcelNumber: { contains: q, mode: "insensitive" } },
              { city: { contains: q, mode: "insensitive" } },
              { zip: { contains: q } },
            ],
          },
          take: 25,
        })
      : Promise.resolve([]),
    scope.deals
      ? prisma.deal.findMany({
          where: {
            organizationId,
            deletedAt: null,
            OR: [
              { property: { addressLine1: { contains: q, mode: "insensitive" } } },
              { lead: { contact: { firstName: { contains: q, mode: "insensitive" } } } },
              { lead: { contact: { lastName: { contains: q, mode: "insensitive" } } } },
            ],
          },
          include: { lead: { include: { contact: true } }, property: true },
          take: 25,
        })
      : Promise.resolve([]),
    scope.documents
      ? prisma.document.findMany({
          where: { organizationId, deletedAt: null, fileName: { contains: q, mode: "insensitive" } },
          take: 25,
        })
      : Promise.resolve([]),
  ]);

  return { leads, properties, deals, documents };
}
