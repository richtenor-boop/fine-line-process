import "server-only";
import { prisma } from "@/lib/db";
import type { CreateBuyerInput } from "./schema";

function splitList(raw?: string): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function createBuyer(organizationId: string, createdById: string, input: CreateBuyerInput) {
  return prisma.$transaction(async (tx) => {
    let contactId = input.contactId;
    if (input.contactMode === "new") {
      const contact = await tx.contact.create({
        data: {
          organizationId,
          firstName: input.firstName!,
          lastName: input.lastName!,
          type: "BUYER",
          createdById,
          phoneNumbers: input.phone ? { create: [{ organizationId, number: input.phone, isPrimary: true }] } : undefined,
          emailAddresses: input.email
            ? { create: [{ organizationId, email: input.email.toLowerCase(), isPrimary: true }] }
            : undefined,
        },
      });
      contactId = contact.id;
    }
    if (!contactId) throw new Error("A contact is required to create a buyer.");

    const existingBuyer = await tx.buyer.findUnique({ where: { contactId } });
    if (existingBuyer) throw new Error("This contact is already a buyer.");

    return tx.buyer.create({
      data: {
        organizationId,
        contactId,
        companyName: input.companyName || null,
        markets: splitList(input.markets),
        zipCodes: splitList(input.zipCodes),
        propertyTypes: input.propertyTypes ?? [],
        minPrice: input.minPrice ?? null,
        maxPrice: input.maxPrice ?? null,
        minBedrooms: input.minBedrooms ?? null,
        maxRehabBudget: input.maxRehabBudget ?? null,
        strategy: input.strategy ?? null,
        isCashBuyer: input.isCashBuyer,
      },
    });
  });
}

export async function listBuyers(organizationId: string) {
  return prisma.buyer.findMany({
    where: { organizationId, deletedAt: null },
    include: { contact: { include: { phoneNumbers: true, emailAddresses: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getBuyer(organizationId: string, buyerId: string) {
  return prisma.buyer.findFirst({
    where: { id: buyerId, organizationId, deletedAt: null },
    include: { contact: { include: { phoneNumbers: true, emailAddresses: true } }, deals: { include: { property: true } } },
  });
}

/** Source spec §15: "Allow properties to be matched against buyer criteria." Markets are matched
 * loosely against the property's city/state (free-text field, not a controlled list) so a buyer
 * entering "Atlanta" or "GA" both work; zip codes and property type match exactly when set. An
 * empty criterion on the buyer means "no preference," not "excludes everything." */
export async function findMatchingBuyers(organizationId: string, propertyId: string) {
  const property = await prisma.property.findFirst({ where: { id: propertyId, organizationId } });
  if (!property) return [];

  const buyers = await prisma.buyer.findMany({
    where: { organizationId, deletedAt: null },
    include: { contact: true },
  });

  return buyers.filter((buyer) => {
    if (buyer.zipCodes.length > 0 && !buyer.zipCodes.includes(property.zip)) return false;
    if (
      buyer.markets.length > 0 &&
      !buyer.markets.some(
        (m) => property.city.toLowerCase().includes(m.toLowerCase()) || property.state.toLowerCase() === m.toLowerCase(),
      )
    ) {
      return false;
    }
    if (buyer.propertyTypes.length > 0 && !buyer.propertyTypes.includes(property.propertyType)) return false;
    const price = property.estimatedValue ? Number(property.estimatedValue) : null;
    if (price !== null) {
      if (buyer.minPrice !== null && price < Number(buyer.minPrice)) return false;
      if (buyer.maxPrice !== null && price > Number(buyer.maxPrice)) return false;
    }
    if (buyer.minBedrooms !== null && property.bedrooms !== null && property.bedrooms < buyer.minBedrooms) return false;
    return true;
  });
}

export async function deleteBuyer(organizationId: string, buyerId: string) {
  await prisma.buyer.update({ where: { id: buyerId, organizationId }, data: { deletedAt: new Date() } });
}
