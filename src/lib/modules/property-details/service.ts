import "server-only";
import { prisma } from "@/lib/db";
import type {
  UpsertForeclosureInput,
  UpsertTaxSaleInput,
  CreateTaxSurplusClaimInput,
  UpsertMortgageSurplusClaimInput,
  UpsertProbateCaseInput,
  UpsertShortSaleInput,
  UpsertCreativeFinanceDealInput,
  CreateLienInput,
  CreateMortgageInput,
  CreateAuctionInput,
  CreateValuationInput,
  CreateComparableSaleInput,
  CreateRepairEstimateInput,
} from "./schema";

async function assertPropertyInOrg(organizationId: string, propertyId: string) {
  const property = await prisma.property.findFirst({ where: { id: propertyId, organizationId } });
  if (!property) throw new Error("Property does not belong to this organization.");
}

export async function getPropertyDetails(organizationId: string, propertyId: string) {
  const [
    foreclosure,
    taxSale,
    mortgageSurplusClaims,
    probateCase,
    shortSale,
    creativeFinanceDeal,
    liens,
    mortgages,
    auctions,
    valuations,
    comparableSales,
    repairEstimates,
  ] = await Promise.all([
    prisma.foreclosure.findFirst({ where: { propertyId, organizationId } }),
    prisma.taxSale.findFirst({
      where: { propertyId, organizationId },
      include: { surplusClaims: { orderBy: { createdAt: "desc" } } },
    }),
    prisma.mortgageSurplusClaim.findMany({ where: { propertyId, organizationId }, orderBy: { createdAt: "desc" } }),
    prisma.probateCase.findFirst({ where: { propertyId, organizationId } }),
    prisma.shortSale.findFirst({ where: { propertyId, organizationId } }),
    prisma.creativeFinanceDeal.findFirst({ where: { propertyId, organizationId } }),
    prisma.lien.findMany({ where: { propertyId, organizationId }, orderBy: { createdAt: "desc" } }),
    prisma.mortgage.findMany({ where: { propertyId, organizationId }, orderBy: { createdAt: "desc" } }),
    prisma.auction.findMany({ where: { propertyId, organizationId }, orderBy: { auctionDate: "desc" } }),
    prisma.propertyValuation.findMany({ where: { propertyId, organizationId }, orderBy: { asOfDate: "desc" } }),
    prisma.comparableSale.findMany({ where: { propertyId, organizationId }, orderBy: { soldDate: "desc" } }),
    prisma.repairEstimate.findMany({ where: { propertyId, organizationId }, orderBy: { createdAt: "desc" } }),
  ]);

  return {
    foreclosure,
    taxSale,
    mortgageSurplusClaims,
    probateCase,
    shortSale,
    creativeFinanceDeal,
    liens,
    mortgages,
    auctions,
    valuations,
    comparableSales,
    repairEstimates,
  };
}

export async function upsertForeclosure(organizationId: string, input: UpsertForeclosureInput) {
  await assertPropertyInOrg(organizationId, input.propertyId);
  return prisma.foreclosure.upsert({
    where: { propertyId: input.propertyId },
    create: {
      organizationId,
      propertyId: input.propertyId,
      status: input.status,
      defaultAmount: input.defaultAmount ?? null,
      auctionDate: input.auctionDate ? new Date(input.auctionDate) : null,
      trusteeName: input.trusteeName || null,
      caseNumber: input.caseNumber || null,
    },
    update: {
      status: input.status,
      defaultAmount: input.defaultAmount ?? null,
      auctionDate: input.auctionDate ? new Date(input.auctionDate) : null,
      trusteeName: input.trusteeName || null,
      caseNumber: input.caseNumber || null,
    },
  });
}

export async function upsertTaxSale(organizationId: string, input: UpsertTaxSaleInput) {
  await assertPropertyInOrg(organizationId, input.propertyId);
  return prisma.taxSale.upsert({
    where: { propertyId: input.propertyId },
    create: {
      organizationId,
      propertyId: input.propertyId,
      status: input.status,
      saleDate: input.saleDate ? new Date(input.saleDate) : null,
      saleAmount: input.saleAmount ?? null,
      overbidAmount: input.overbidAmount ?? null,
    },
    update: {
      status: input.status,
      saleDate: input.saleDate ? new Date(input.saleDate) : null,
      saleAmount: input.saleAmount ?? null,
      overbidAmount: input.overbidAmount ?? null,
    },
  });
}

export async function createTaxSurplusClaim(organizationId: string, input: CreateTaxSurplusClaimInput) {
  const taxSale = await prisma.taxSale.findFirst({ where: { id: input.taxSaleId, organizationId } });
  if (!taxSale) throw new Error("Tax sale does not belong to this organization.");
  return prisma.taxSurplusClaim.create({
    data: {
      organizationId,
      taxSaleId: input.taxSaleId,
      status: input.status,
      surplusAmount: input.surplusAmount ?? null,
    },
  });
}

export async function deleteTaxSurplusClaim(organizationId: string, claimId: string) {
  const claim = await prisma.taxSurplusClaim.findFirst({ where: { id: claimId, organizationId } });
  if (!claim) throw new Error("Claim does not belong to this organization.");
  await prisma.taxSurplusClaim.delete({ where: { id: claimId } });
}

export async function createMortgageSurplusClaim(organizationId: string, input: UpsertMortgageSurplusClaimInput) {
  await assertPropertyInOrg(organizationId, input.propertyId);
  return prisma.mortgageSurplusClaim.create({
    data: {
      organizationId,
      propertyId: input.propertyId,
      status: input.status,
      surplusAmount: input.surplusAmount ?? null,
    },
  });
}

export async function deleteMortgageSurplusClaim(organizationId: string, claimId: string) {
  const claim = await prisma.mortgageSurplusClaim.findFirst({ where: { id: claimId, organizationId } });
  if (!claim) throw new Error("Claim does not belong to this organization.");
  await prisma.mortgageSurplusClaim.delete({ where: { id: claimId } });
}

export async function upsertProbateCase(organizationId: string, input: UpsertProbateCaseInput) {
  await assertPropertyInOrg(organizationId, input.propertyId);
  return prisma.probateCase.upsert({
    where: { propertyId: input.propertyId },
    create: {
      organizationId,
      propertyId: input.propertyId,
      status: input.status,
      caseNumber: input.caseNumber || null,
      county: input.county || null,
      filedDate: input.filedDate ? new Date(input.filedDate) : null,
      personalRepresentativeName: input.personalRepresentativeName || null,
    },
    update: {
      status: input.status,
      caseNumber: input.caseNumber || null,
      county: input.county || null,
      filedDate: input.filedDate ? new Date(input.filedDate) : null,
      personalRepresentativeName: input.personalRepresentativeName || null,
    },
  });
}

export async function upsertShortSale(organizationId: string, input: UpsertShortSaleInput) {
  await assertPropertyInOrg(organizationId, input.propertyId);
  return prisma.shortSale.upsert({
    where: { propertyId: input.propertyId },
    create: {
      organizationId,
      propertyId: input.propertyId,
      status: input.status,
      lenderName: input.lenderName || null,
      loanNumber: input.loanNumber || null,
    },
    update: {
      status: input.status,
      lenderName: input.lenderName || null,
      loanNumber: input.loanNumber || null,
    },
  });
}

export async function upsertCreativeFinanceDeal(organizationId: string, input: UpsertCreativeFinanceDealInput) {
  await assertPropertyInOrg(organizationId, input.propertyId);
  return prisma.creativeFinanceDeal.upsert({
    where: { propertyId: input.propertyId },
    create: {
      organizationId,
      propertyId: input.propertyId,
      structureType: input.structureType,
      terms: input.terms || null,
      monthlyPayment: input.monthlyPayment ?? null,
    },
    update: {
      structureType: input.structureType,
      terms: input.terms || null,
      monthlyPayment: input.monthlyPayment ?? null,
    },
  });
}

export async function createLien(organizationId: string, input: CreateLienInput) {
  await assertPropertyInOrg(organizationId, input.propertyId);
  return prisma.lien.create({
    data: {
      organizationId,
      propertyId: input.propertyId,
      holderName: input.holderName,
      amount: input.amount ?? null,
      filedDate: input.filedDate ? new Date(input.filedDate) : null,
      lienType: input.lienType || null,
    },
  });
}

export async function deleteLien(organizationId: string, lienId: string) {
  const lien = await prisma.lien.findFirst({ where: { id: lienId, organizationId } });
  if (!lien) throw new Error("Lien does not belong to this organization.");
  await prisma.lien.delete({ where: { id: lienId } });
}

export async function createMortgage(organizationId: string, input: CreateMortgageInput) {
  await assertPropertyInOrg(organizationId, input.propertyId);
  return prisma.mortgage.create({
    data: {
      organizationId,
      propertyId: input.propertyId,
      lenderName: input.lenderName,
      originalAmount: input.originalAmount ?? null,
      currentBalance: input.currentBalance ?? null,
      originationDate: input.originationDate ? new Date(input.originationDate) : null,
    },
  });
}

export async function deleteMortgage(organizationId: string, mortgageId: string) {
  const mortgage = await prisma.mortgage.findFirst({ where: { id: mortgageId, organizationId } });
  if (!mortgage) throw new Error("Mortgage does not belong to this organization.");
  await prisma.mortgage.delete({ where: { id: mortgageId } });
}

export async function createAuction(organizationId: string, input: CreateAuctionInput) {
  await assertPropertyInOrg(organizationId, input.propertyId);
  return prisma.auction.create({
    data: {
      organizationId,
      propertyId: input.propertyId,
      auctionDate: new Date(input.auctionDate),
      location: input.location || null,
      openingBid: input.openingBid ?? null,
      result: input.result || null,
    },
  });
}

export async function deleteAuction(organizationId: string, auctionId: string) {
  const auction = await prisma.auction.findFirst({ where: { id: auctionId, organizationId } });
  if (!auction) throw new Error("Auction does not belong to this organization.");
  await prisma.auction.delete({ where: { id: auctionId } });
}

export async function createValuation(organizationId: string, input: CreateValuationInput) {
  await assertPropertyInOrg(organizationId, input.propertyId);
  return prisma.propertyValuation.create({
    data: {
      organizationId,
      propertyId: input.propertyId,
      source: input.source,
      value: input.value,
      asOfDate: new Date(input.asOfDate),
    },
  });
}

export async function deleteValuation(organizationId: string, valuationId: string) {
  const valuation = await prisma.propertyValuation.findFirst({ where: { id: valuationId, organizationId } });
  if (!valuation) throw new Error("Valuation does not belong to this organization.");
  await prisma.propertyValuation.delete({ where: { id: valuationId } });
}

export async function createComparableSale(organizationId: string, input: CreateComparableSaleInput) {
  await assertPropertyInOrg(organizationId, input.propertyId);
  return prisma.comparableSale.create({
    data: {
      organizationId,
      propertyId: input.propertyId,
      addressLine1: input.addressLine1,
      soldPrice: input.soldPrice,
      soldDate: new Date(input.soldDate),
      distanceMiles: input.distanceMiles ?? null,
      squareFeet: input.squareFeet ?? null,
    },
  });
}

export async function deleteComparableSale(organizationId: string, comparableSaleId: string) {
  const comp = await prisma.comparableSale.findFirst({ where: { id: comparableSaleId, organizationId } });
  if (!comp) throw new Error("Comparable sale does not belong to this organization.");
  await prisma.comparableSale.delete({ where: { id: comparableSaleId } });
}

export async function createRepairEstimate(organizationId: string, input: CreateRepairEstimateInput) {
  await assertPropertyInOrg(organizationId, input.propertyId);
  return prisma.repairEstimate.create({
    data: {
      organizationId,
      propertyId: input.propertyId,
      category: input.category,
      estimatedCost: input.estimatedCost,
      notes: input.notes || null,
    },
  });
}

export async function deleteRepairEstimate(organizationId: string, repairEstimateId: string) {
  const estimate = await prisma.repairEstimate.findFirst({ where: { id: repairEstimateId, organizationId } });
  if (!estimate) throw new Error("Repair estimate does not belong to this organization.");
  await prisma.repairEstimate.delete({ where: { id: repairEstimateId } });
}
