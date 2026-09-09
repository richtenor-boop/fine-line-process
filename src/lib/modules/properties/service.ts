import "server-only";
import { prisma } from "@/lib/db";
import type { PropertyType } from "@prisma/client";
import type { CreatePropertyInput, NewOwnerContactInput } from "./schema";

function computeEquity(estimatedValue?: number, mortgageBalance?: number) {
  if (estimatedValue === undefined || mortgageBalance === undefined) return undefined;
  return estimatedValue - mortgageBalance;
}

interface CreatePropertyOptions {
  existingOwnerContactId?: string;
  newOwnerContact?: NewOwnerContactInput;
}

export async function createProperty(
  organizationId: string,
  input: CreatePropertyInput,
  options: CreatePropertyOptions = {},
) {
  const estimatedEquity = computeEquity(input.estimatedValue, input.mortgageBalance);

  return prisma.$transaction(async (tx) => {
    const property = await tx.property.create({
      data: {
        organizationId,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2 || null,
        city: input.city,
        county: input.county || null,
        state: input.state.toUpperCase(),
        zip: input.zip,
        propertyType: input.propertyType,
        bedrooms: input.bedrooms ?? null,
        bathrooms: input.bathrooms ?? null,
        squareFeet: input.squareFeet ?? null,
        yearBuilt: input.yearBuilt ?? null,
        estimatedValue: input.estimatedValue ?? null,
        mortgageBalance: input.mortgageBalance ?? null,
        estimatedEquity: estimatedEquity ?? null,
      },
    });

    let ownerContactId = options.existingOwnerContactId;
    if (!ownerContactId && options.newOwnerContact) {
      const contact = await tx.contact.create({
        data: {
          organizationId,
          firstName: options.newOwnerContact.firstName,
          lastName: options.newOwnerContact.lastName,
          type: "SELLER",
          phoneNumbers: options.newOwnerContact.phone
            ? { create: [{ organizationId, number: options.newOwnerContact.phone, isPrimary: true }] }
            : undefined,
          emailAddresses: options.newOwnerContact.email
            ? { create: [{ organizationId, email: options.newOwnerContact.email.toLowerCase(), isPrimary: true }] }
            : undefined,
        },
      });
      ownerContactId = contact.id;
    }

    if (ownerContactId) {
      await tx.propertyOwner.create({
        data: { organizationId, propertyId: property.id, contactId: ownerContactId, ownershipType: "SOLE" },
      });
    }

    return property;
  });
}

export async function getProperty(organizationId: string, propertyId: string) {
  return prisma.property.findFirst({
    where: { id: propertyId, organizationId, deletedAt: null },
    include: {
      owners: { include: { contact: { include: { phoneNumbers: true, emailAddresses: true } } } },
      leads: { include: { stage: true } },
      notes: { include: { author: true }, orderBy: { createdAt: "desc" } },
      customFieldValues: { include: { definition: true } },
    },
  });
}

export type SpecializedCaseFilter = "FORECLOSURE" | "TAX_SALE" | "PROBATE" | "SHORT_SALE";

export interface ListPropertiesFilters {
  state?: string;
  county?: string;
  city?: string;
  zip?: string;
  propertyType?: PropertyType;
  minEquity?: number;
  caseType?: SpecializedCaseFilter;
}

const CASE_TYPE_RELATION_FILTER: Record<SpecializedCaseFilter, Record<string, unknown>> = {
  FORECLOSURE: { foreclosure: { isNot: null } },
  TAX_SALE: { taxSale: { isNot: null } },
  PROBATE: { probateCase: { isNot: null } },
  SHORT_SALE: { shortSale: { isNot: null } },
};

export async function listProperties(organizationId: string, filters: ListPropertiesFilters = {}) {
  return prisma.property.findMany({
    where: {
      organizationId,
      deletedAt: null,
      ...(filters.state ? { state: filters.state.toUpperCase() } : {}),
      ...(filters.county ? { county: { contains: filters.county, mode: "insensitive" } } : {}),
      ...(filters.city ? { city: { contains: filters.city, mode: "insensitive" } } : {}),
      ...(filters.zip ? { zip: filters.zip } : {}),
      ...(filters.propertyType ? { propertyType: filters.propertyType } : {}),
      ...(filters.minEquity !== undefined ? { estimatedEquity: { gte: filters.minEquity } } : {}),
      ...(filters.caseType ? CASE_TYPE_RELATION_FILTER[filters.caseType] : {}),
    },
    include: {
      owners: { include: { contact: true } },
      foreclosure: true,
      taxSale: true,
      probateCase: true,
      shortSale: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function addOwner(organizationId: string, propertyId: string, contactId: string) {
  const [property, contact] = await Promise.all([
    prisma.property.findFirst({ where: { id: propertyId, organizationId } }),
    prisma.contact.findFirst({ where: { id: contactId, organizationId } }),
  ]);
  if (!property || !contact) throw new Error("Property or contact does not belong to this organization.");

  return prisma.propertyOwner.create({
    data: { organizationId, propertyId, contactId, ownershipType: "SOLE" },
  });
}

export async function removeOwner(organizationId: string, propertyOwnerId: string) {
  const owner = await prisma.propertyOwner.findFirst({ where: { id: propertyOwnerId, organizationId } });
  if (!owner) throw new Error("Owner link does not belong to this organization.");
  await prisma.propertyOwner.delete({ where: { id: propertyOwnerId } });
}
