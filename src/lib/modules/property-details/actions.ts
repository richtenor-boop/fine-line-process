"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import * as schema from "./schema";
import * as service from "./service";

function parseOrThrow<T>(zodSchema: { safeParse: (v: unknown) => { success: boolean; data?: T; error?: { issues: { message: string }[] } } }, raw: unknown): T {
  const parsed = zodSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error?.issues[0]?.message ?? "Invalid input.");
  return parsed.data as T;
}

function formValue(formData: FormData, key: string): string | undefined {
  const value = formData.get(key)?.toString();
  return value || undefined;
}

async function auditAndRevalidate(
  organizationId: string,
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  propertyId: string,
) {
  await writeAuditLog({ organizationId, userId, action, entityType, entityId });
  revalidatePath(`/properties/${propertyId}`);
}

export async function upsertForeclosureAction(formData: FormData): Promise<void> {
  const session = await requirePermission("properties:edit");
  const input = parseOrThrow(schema.upsertForeclosureSchema, {
    propertyId: formData.get("propertyId"),
    status: formData.get("status"),
    defaultAmount: formValue(formData, "defaultAmount"),
    auctionDate: formValue(formData, "auctionDate"),
    trusteeName: formValue(formData, "trusteeName"),
    caseNumber: formValue(formData, "caseNumber"),
  });
  const record = await service.upsertForeclosure(session.user.organizationId, input);
  await auditAndRevalidate(session.user.organizationId, session.user.id, "foreclosure.updated", "Foreclosure", record.id, input.propertyId);
}

export async function upsertTaxSaleAction(formData: FormData): Promise<void> {
  const session = await requirePermission("properties:edit");
  const input = parseOrThrow(schema.upsertTaxSaleSchema, {
    propertyId: formData.get("propertyId"),
    status: formData.get("status"),
    saleDate: formValue(formData, "saleDate"),
    saleAmount: formValue(formData, "saleAmount"),
    overbidAmount: formValue(formData, "overbidAmount"),
  });
  const record = await service.upsertTaxSale(session.user.organizationId, input);
  await auditAndRevalidate(session.user.organizationId, session.user.id, "tax_sale.updated", "TaxSale", record.id, input.propertyId);
}

export async function createTaxSurplusClaimAction(formData: FormData): Promise<void> {
  const session = await requirePermission("properties:edit");
  const propertyId = String(formData.get("propertyId"));
  const input = parseOrThrow(schema.createTaxSurplusClaimSchema, {
    taxSaleId: formData.get("taxSaleId"),
    status: formData.get("status") || undefined,
    surplusAmount: formValue(formData, "surplusAmount"),
  });
  const record = await service.createTaxSurplusClaim(session.user.organizationId, input);
  await auditAndRevalidate(session.user.organizationId, session.user.id, "tax_surplus_claim.created", "TaxSurplusClaim", record.id, propertyId);
}

export async function deleteTaxSurplusClaimAction(formData: FormData): Promise<void> {
  const session = await requirePermission("properties:edit");
  const claimId = String(formData.get("claimId"));
  const propertyId = String(formData.get("propertyId"));
  await service.deleteTaxSurplusClaim(session.user.organizationId, claimId);
  await auditAndRevalidate(session.user.organizationId, session.user.id, "tax_surplus_claim.deleted", "TaxSurplusClaim", claimId, propertyId);
}

export async function createMortgageSurplusClaimAction(formData: FormData): Promise<void> {
  const session = await requirePermission("properties:edit");
  const input = parseOrThrow(schema.upsertMortgageSurplusClaimSchema, {
    propertyId: formData.get("propertyId"),
    status: formData.get("status"),
    surplusAmount: formValue(formData, "surplusAmount"),
  });
  const record = await service.createMortgageSurplusClaim(session.user.organizationId, input);
  await auditAndRevalidate(session.user.organizationId, session.user.id, "mortgage_surplus_claim.created", "MortgageSurplusClaim", record.id, input.propertyId);
}

export async function deleteMortgageSurplusClaimAction(formData: FormData): Promise<void> {
  const session = await requirePermission("properties:edit");
  const claimId = String(formData.get("claimId"));
  const propertyId = String(formData.get("propertyId"));
  await service.deleteMortgageSurplusClaim(session.user.organizationId, claimId);
  await auditAndRevalidate(session.user.organizationId, session.user.id, "mortgage_surplus_claim.deleted", "MortgageSurplusClaim", claimId, propertyId);
}

export async function upsertProbateCaseAction(formData: FormData): Promise<void> {
  const session = await requirePermission("properties:edit");
  const input = parseOrThrow(schema.upsertProbateCaseSchema, {
    propertyId: formData.get("propertyId"),
    status: formData.get("status"),
    caseNumber: formValue(formData, "caseNumber"),
    county: formValue(formData, "county"),
    filedDate: formValue(formData, "filedDate"),
    personalRepresentativeName: formValue(formData, "personalRepresentativeName"),
  });
  const record = await service.upsertProbateCase(session.user.organizationId, input);
  await auditAndRevalidate(session.user.organizationId, session.user.id, "probate_case.updated", "ProbateCase", record.id, input.propertyId);
}

export async function upsertShortSaleAction(formData: FormData): Promise<void> {
  const session = await requirePermission("properties:edit");
  const input = parseOrThrow(schema.upsertShortSaleSchema, {
    propertyId: formData.get("propertyId"),
    status: formData.get("status"),
    lenderName: formValue(formData, "lenderName"),
    loanNumber: formValue(formData, "loanNumber"),
  });
  const record = await service.upsertShortSale(session.user.organizationId, input);
  await auditAndRevalidate(session.user.organizationId, session.user.id, "short_sale.updated", "ShortSale", record.id, input.propertyId);
}

export async function upsertCreativeFinanceDealAction(formData: FormData): Promise<void> {
  const session = await requirePermission("properties:edit");
  const input = parseOrThrow(schema.upsertCreativeFinanceDealSchema, {
    propertyId: formData.get("propertyId"),
    structureType: formData.get("structureType"),
    terms: formValue(formData, "terms"),
    monthlyPayment: formValue(formData, "monthlyPayment"),
  });
  const record = await service.upsertCreativeFinanceDeal(session.user.organizationId, input);
  await auditAndRevalidate(session.user.organizationId, session.user.id, "creative_finance_deal.updated", "CreativeFinanceDeal", record.id, input.propertyId);
}

export async function createLienAction(formData: FormData): Promise<void> {
  const session = await requirePermission("properties:edit");
  const input = parseOrThrow(schema.createLienSchema, {
    propertyId: formData.get("propertyId"),
    holderName: formData.get("holderName"),
    amount: formValue(formData, "amount"),
    filedDate: formValue(formData, "filedDate"),
    lienType: formValue(formData, "lienType"),
  });
  const record = await service.createLien(session.user.organizationId, input);
  await auditAndRevalidate(session.user.organizationId, session.user.id, "lien.created", "Lien", record.id, input.propertyId);
}

export async function deleteLienAction(formData: FormData): Promise<void> {
  const session = await requirePermission("properties:edit");
  const lienId = String(formData.get("lienId"));
  const propertyId = String(formData.get("propertyId"));
  await service.deleteLien(session.user.organizationId, lienId);
  await auditAndRevalidate(session.user.organizationId, session.user.id, "lien.deleted", "Lien", lienId, propertyId);
}

export async function createMortgageAction(formData: FormData): Promise<void> {
  const session = await requirePermission("properties:edit");
  const input = parseOrThrow(schema.createMortgageSchema, {
    propertyId: formData.get("propertyId"),
    lenderName: formData.get("lenderName"),
    originalAmount: formValue(formData, "originalAmount"),
    currentBalance: formValue(formData, "currentBalance"),
    originationDate: formValue(formData, "originationDate"),
  });
  const record = await service.createMortgage(session.user.organizationId, input);
  await auditAndRevalidate(session.user.organizationId, session.user.id, "mortgage.created", "Mortgage", record.id, input.propertyId);
}

export async function deleteMortgageAction(formData: FormData): Promise<void> {
  const session = await requirePermission("properties:edit");
  const mortgageId = String(formData.get("mortgageId"));
  const propertyId = String(formData.get("propertyId"));
  await service.deleteMortgage(session.user.organizationId, mortgageId);
  await auditAndRevalidate(session.user.organizationId, session.user.id, "mortgage.deleted", "Mortgage", mortgageId, propertyId);
}

export async function createAuctionAction(formData: FormData): Promise<void> {
  const session = await requirePermission("properties:edit");
  const input = parseOrThrow(schema.createAuctionSchema, {
    propertyId: formData.get("propertyId"),
    auctionDate: formData.get("auctionDate"),
    location: formValue(formData, "location"),
    openingBid: formValue(formData, "openingBid"),
    result: formValue(formData, "result"),
  });
  const record = await service.createAuction(session.user.organizationId, input);
  await auditAndRevalidate(session.user.organizationId, session.user.id, "auction.created", "Auction", record.id, input.propertyId);
}

export async function deleteAuctionAction(formData: FormData): Promise<void> {
  const session = await requirePermission("properties:edit");
  const auctionId = String(formData.get("auctionId"));
  const propertyId = String(formData.get("propertyId"));
  await service.deleteAuction(session.user.organizationId, auctionId);
  await auditAndRevalidate(session.user.organizationId, session.user.id, "auction.deleted", "Auction", auctionId, propertyId);
}

export async function createValuationAction(formData: FormData): Promise<void> {
  const session = await requirePermission("properties:edit");
  const input = parseOrThrow(schema.createValuationSchema, {
    propertyId: formData.get("propertyId"),
    source: formData.get("source"),
    value: formData.get("value"),
    asOfDate: formData.get("asOfDate"),
  });
  const record = await service.createValuation(session.user.organizationId, input);
  await auditAndRevalidate(session.user.organizationId, session.user.id, "valuation.created", "PropertyValuation", record.id, input.propertyId);
}

export async function deleteValuationAction(formData: FormData): Promise<void> {
  const session = await requirePermission("properties:edit");
  const valuationId = String(formData.get("valuationId"));
  const propertyId = String(formData.get("propertyId"));
  await service.deleteValuation(session.user.organizationId, valuationId);
  await auditAndRevalidate(session.user.organizationId, session.user.id, "valuation.deleted", "PropertyValuation", valuationId, propertyId);
}

export async function createComparableSaleAction(formData: FormData): Promise<void> {
  const session = await requirePermission("properties:edit");
  const input = parseOrThrow(schema.createComparableSaleSchema, {
    propertyId: formData.get("propertyId"),
    addressLine1: formData.get("addressLine1"),
    soldPrice: formData.get("soldPrice"),
    soldDate: formData.get("soldDate"),
    distanceMiles: formValue(formData, "distanceMiles"),
    squareFeet: formValue(formData, "squareFeet"),
  });
  const record = await service.createComparableSale(session.user.organizationId, input);
  await auditAndRevalidate(session.user.organizationId, session.user.id, "comparable_sale.created", "ComparableSale", record.id, input.propertyId);
}

export async function deleteComparableSaleAction(formData: FormData): Promise<void> {
  const session = await requirePermission("properties:edit");
  const comparableSaleId = String(formData.get("comparableSaleId"));
  const propertyId = String(formData.get("propertyId"));
  await service.deleteComparableSale(session.user.organizationId, comparableSaleId);
  await auditAndRevalidate(session.user.organizationId, session.user.id, "comparable_sale.deleted", "ComparableSale", comparableSaleId, propertyId);
}

export async function createRepairEstimateAction(formData: FormData): Promise<void> {
  const session = await requirePermission("properties:edit");
  const input = parseOrThrow(schema.createRepairEstimateSchema, {
    propertyId: formData.get("propertyId"),
    category: formData.get("category"),
    estimatedCost: formData.get("estimatedCost"),
    notes: formValue(formData, "notes"),
  });
  const record = await service.createRepairEstimate(session.user.organizationId, input);
  await auditAndRevalidate(session.user.organizationId, session.user.id, "repair_estimate.created", "RepairEstimate", record.id, input.propertyId);
}

export async function deleteRepairEstimateAction(formData: FormData): Promise<void> {
  const session = await requirePermission("properties:edit");
  const repairEstimateId = String(formData.get("repairEstimateId"));
  const propertyId = String(formData.get("propertyId"));
  await service.deleteRepairEstimate(session.user.organizationId, repairEstimateId);
  await auditAndRevalidate(session.user.organizationId, session.user.id, "repair_estimate.deleted", "RepairEstimate", repairEstimateId, propertyId);
}
