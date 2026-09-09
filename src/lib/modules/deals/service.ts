import "server-only";
import { prisma } from "@/lib/db";
import type { OfferStatus, ContractStatus, DealStage } from "@prisma/client";
import type { CreateOfferInput, AddTransactionInput } from "./schema";

// --- Offers ------------------------------------------------------------------------------------

export async function listOffersForLead(organizationId: string, leadId: string) {
  return prisma.offer.findMany({
    where: { organizationId, leadId },
    include: { contract: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createOffer(organizationId: string, createdById: string, input: CreateOfferInput) {
  const lead = await prisma.lead.findFirst({ where: { id: input.leadId, organizationId } });
  if (!lead) throw new Error("Lead does not belong to this organization.");

  return prisma.offer.create({
    data: { organizationId, leadId: input.leadId, amount: input.amount, notes: input.notes || null, createdById },
  });
}

export async function updateOfferStatus(organizationId: string, offerId: string, status: OfferStatus) {
  const offer = await prisma.offer.findFirst({ where: { id: offerId, organizationId } });
  if (!offer) throw new Error("Offer does not belong to this organization.");

  return prisma.offer.update({
    where: { id: offerId },
    data: {
      status,
      sentAt: status === "SENT" && !offer.sentAt ? new Date() : offer.sentAt,
      respondedAt: ["ACCEPTED", "REJECTED", "COUNTERED"].includes(status) ? new Date() : offer.respondedAt,
    },
  });
}

// --- Contracts -----------------------------------------------------------------------------------

export async function createContract(organizationId: string, offerId: string) {
  const offer = await prisma.offer.findFirst({ where: { id: offerId, organizationId } });
  if (!offer) throw new Error("Offer does not belong to this organization.");
  if (offer.status !== "ACCEPTED") throw new Error("Only an accepted offer can become a contract.");

  const existing = await prisma.contract.findUnique({ where: { offerId } });
  if (existing) return existing;

  return prisma.contract.create({ data: { organizationId, offerId } });
}

export async function updateContractStatus(organizationId: string, contractId: string, status: ContractStatus) {
  const contract = await prisma.contract.findFirst({ where: { id: contractId, organizationId } });
  if (!contract) throw new Error("Contract does not belong to this organization.");

  return prisma.contract.update({
    where: { id: contractId },
    data: { status, signedAt: status === "SIGNED" && !contract.signedAt ? new Date() : contract.signedAt },
  });
}

// --- Deals -------------------------------------------------------------------------------------

export async function createDeal(organizationId: string, ownerUserId: string, contractId: string) {
  const contract = await prisma.contract.findFirst({
    where: { id: contractId, organizationId },
    include: { offer: { include: { lead: true } } },
  });
  if (!contract) throw new Error("Contract does not belong to this organization.");
  if (contract.status !== "SIGNED") throw new Error("Only a signed contract can become a deal.");

  const existing = await prisma.deal.findUnique({ where: { leadId: contract.offer.leadId } });
  if (existing) return existing;

  return prisma.deal.create({
    data: {
      organizationId,
      leadId: contract.offer.leadId,
      propertyId: contract.offer.lead.propertyId,
      contractId: contract.id,
      ownerUserId,
      purchasePrice: contract.offer.amount,
      stage: "UNDER_CONTRACT",
    },
  });
}

export async function getDealIdForLead(organizationId: string, leadId: string) {
  const deal = await prisma.deal.findFirst({ where: { leadId, organizationId, deletedAt: null }, select: { id: true } });
  return deal?.id ?? null;
}

export async function listDeals(organizationId: string) {
  return prisma.deal.findMany({
    where: { organizationId, deletedAt: null },
    include: { lead: { include: { contact: true } }, property: true, buyer: { include: { contact: true } } },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getDeal(organizationId: string, dealId: string) {
  return prisma.deal.findFirst({
    where: { id: dealId, organizationId, deletedAt: null },
    include: {
      lead: { include: { contact: true } },
      property: true,
      contract: { include: { offer: true } },
      buyer: { include: { contact: true } },
      transactions: { orderBy: { occurredOn: "desc" } },
      notes: { include: { author: true }, orderBy: { createdAt: "desc" } },
    },
  });
}

export async function updateDealStage(organizationId: string, dealId: string, stage: DealStage) {
  const deal = await prisma.deal.findFirst({ where: { id: dealId, organizationId } });
  if (!deal) throw new Error("Deal does not belong to this organization.");

  return prisma.deal.update({
    where: { id: dealId },
    data: {
      stage,
      closedAt: (stage === "CLOSED_WON" || stage === "CLOSED_LOST") && !deal.closedAt ? new Date() : deal.closedAt,
    },
  });
}

export async function setDealBuyer(organizationId: string, dealId: string, buyerId: string | null) {
  const deal = await prisma.deal.findFirst({ where: { id: dealId, organizationId } });
  if (!deal) throw new Error("Deal does not belong to this organization.");
  return prisma.deal.update({ where: { id: dealId }, data: { buyerId } });
}

export async function setDealSalePrice(organizationId: string, dealId: string, salePrice: number, assignmentFee?: number) {
  const deal = await prisma.deal.findFirst({ where: { id: dealId, organizationId } });
  if (!deal) throw new Error("Deal does not belong to this organization.");
  return prisma.deal.update({
    where: { id: dealId },
    data: { salePrice, assignmentFee: assignmentFee ?? deal.assignmentFee },
  });
}

export async function countDealsUnderContract(organizationId: string) {
  return prisma.deal.count({ where: { organizationId, deletedAt: null, stage: "UNDER_CONTRACT" } });
}

export async function getActivePipelineValue(organizationId: string) {
  const deals = await prisma.deal.findMany({
    where: { organizationId, deletedAt: null, stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] } },
    select: { purchasePrice: true },
  });
  return deals.reduce((sum, d) => sum + (d.purchasePrice ? Number(d.purchasePrice) : 0), 0);
}

export async function addTransaction(organizationId: string, input: AddTransactionInput) {
  const deal = await prisma.deal.findFirst({ where: { id: input.dealId, organizationId } });
  if (!deal) throw new Error("Deal does not belong to this organization.");

  return prisma.transaction.create({
    data: {
      organizationId,
      dealId: input.dealId,
      type: input.type,
      amount: input.amount,
      occurredOn: new Date(input.occurredOn),
    },
  });
}
