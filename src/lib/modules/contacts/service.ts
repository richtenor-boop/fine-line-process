import "server-only";
import { prisma } from "@/lib/db";
import type { CreateContactInput } from "./schema";

export async function createContact(organizationId: string, input: CreateContactInput) {
  return prisma.contact.create({
    data: {
      organizationId,
      firstName: input.firstName,
      lastName: input.lastName,
      type: input.type,
      company: input.company || null,
      phoneNumbers: input.phone
        ? { create: [{ organizationId, number: input.phone, isPrimary: true }] }
        : undefined,
      emailAddresses: input.email
        ? { create: [{ organizationId, email: input.email.toLowerCase(), isPrimary: true }] }
        : undefined,
    },
    include: { phoneNumbers: true, emailAddresses: true },
  });
}

export async function getContact(organizationId: string, contactId: string) {
  return prisma.contact.findFirst({
    where: { id: contactId, organizationId, deletedAt: null },
    include: { phoneNumbers: true, emailAddresses: true, mailingAddresses: true },
  });
}

/** Lightweight reuse-lookup (not the Phase 4 duplicate-detection pipeline) — for "find an existing
 * contact instead of creating a new one" autocomplete on the Lead/Property forms. */
export async function searchContacts(organizationId: string, query: string, limit = 10) {
  if (!query.trim()) return [];
  return prisma.contact.findMany({
    where: {
      organizationId,
      deletedAt: null,
      OR: [
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        { emailAddresses: { some: { email: { contains: query, mode: "insensitive" } } } },
        { phoneNumbers: { some: { number: { contains: query } } } },
      ],
    },
    include: { phoneNumbers: true, emailAddresses: true },
    take: limit,
    orderBy: { lastName: "asc" },
  });
}
