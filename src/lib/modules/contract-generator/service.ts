import "server-only";
import { prisma } from "@/lib/db";
import { getStorageAdapter } from "@/lib/storage";
import { renderContract, contractToHtml, contractToText } from "./templates";
import type { GenerateContractInput } from "./schema";

/**
 * Renders the chosen template, saves an HTML copy into the property's Documents (so it shows up
 * next to every other file and can be downloaded/printed), and records the inputs so the draft
 * can be regenerated later.
 */
export async function generateContract(organizationId: string, userId: string, input: GenerateContractInput) {
  const property = await prisma.property.findFirst({
    where: { id: input.propertyId, organizationId, deletedAt: null },
    select: { id: true, addressLine1: true },
  });
  if (!property) throw new Error("Property not found.");

  let leadId: string | null = null;
  if (input.leadId) {
    const lead = await prisma.lead.findFirst({ where: { id: input.leadId, organizationId, deletedAt: null }, select: { id: true } });
    if (!lead) throw new Error("Lead not found.");
    leadId = lead.id;
  }

  const rendered = renderContract(input);
  const html = contractToHtml(rendered);
  const fileName = `${rendered.title} - ${property.addressLine1}.html`.replace(/[\\/:*?"<>|]/g, "-");
  const stored = await getStorageAdapter().putObject({ organizationId, fileName, data: Buffer.from(html, "utf8") });

  return prisma.$transaction(async (tx) => {
    const document = await tx.document.create({
      data: {
        organizationId,
        propertyId: property.id,
        leadId,
        category: "PURCHASE_AGREEMENT",
        fileName,
        storageKey: stored.storageKey,
        mimeType: "text/html",
        sizeBytes: stored.sizeBytes,
        uploadedByUserId: userId,
      },
    });
    return tx.generatedContract.create({
      data: {
        organizationId,
        propertyId: property.id,
        leadId,
        type: input.type,
        title: rendered.title,
        fields: input,
        body: contractToText(rendered),
        documentId: document.id,
        createdById: userId,
      },
    });
  });
}

export async function getGeneratedContract(organizationId: string, contractId: string) {
  return prisma.generatedContract.findFirst({
    where: { id: contractId, organizationId },
    include: { property: { select: { id: true, addressLine1: true } } },
  });
}

export async function listGeneratedContracts(organizationId: string, propertyId: string) {
  return prisma.generatedContract.findMany({
    where: { organizationId, propertyId },
    select: { id: true, title: true, type: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
}

/** Prefill for the generator form: owners as sellers, the org as buyer, numbers from the analyzer. */
export async function getContractDefaults(organizationId: string, propertyId: string) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, organizationId, deletedAt: null },
    include: {
      owners: { include: { contact: { select: { firstName: true, lastName: true } } } },
      leads: { where: { deletedAt: null }, select: { id: true }, orderBy: { createdAt: "desc" }, take: 1 },
      dealAnalysis: true,
      mortgages: { select: { lenderName: true, currentBalance: true }, orderBy: { createdAt: "desc" }, take: 1 },
      organization: { select: { name: true } },
    },
  });
  if (!property) return null;
  const a = property.dealAnalysis;
  const num = (v: { toString(): string } | null | undefined) => (v == null ? undefined : Number(v));
  const closing = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  return {
    propertyId: property.id,
    leadId: property.leads[0]?.id ?? "",
    propertyLabel: property.addressLine1,
    sellerNames: property.owners.map((o) => `${o.contact.firstName} ${o.contact.lastName}`).join(" and "),
    buyerName: `${property.organization.name} and/or assigns`,
    propertyAddress: `${property.addressLine1}${property.addressLine2 ? `, ${property.addressLine2}` : ""}, ${property.city}, ${property.state} ${property.zip}`,
    parcelNumber: property.parcelNumber ?? "",
    closingDate: closing,
    lenderName: property.mortgages[0]?.lenderName ?? "",
    loanBalance: num(a?.existingLoanBalance) ?? num(property.mortgages[0]?.currentBalance) ?? num(property.mortgageBalance),
    monthlyPayment: num(a?.existingMonthlyPayment),
    loanArrears: num(a?.loanArrears),
    repairBudget: num(a?.repairCost),
    sellerAskingPrice: num(a?.sellerAskingPrice),
  };
}
