import { z } from "zod";

/**
 * Phase 9 — source spec §6/§12: the specialized real-estate detail tables (Foreclosure, Tax Sale,
 * Tax/Mortgage Surplus, Probate, Short Sale, Liens, Mortgages, Auctions, Creative Finance,
 * Valuations, Comparable Sales, Repair Estimates) have existed in the schema since Phase 1 with no
 * application code. All 13 are Property-scoped, so they're one cohesive module rather than 13 tiny
 * ones — see docs/05-mvp-plan.md.
 *
 * The 5 "case" types (Foreclosure/TaxSale/ProbateCase/ShortSale/CreativeFinanceDeal) are 1:1 with
 * a Property (a property either has one open case of that type or it doesn't) — upsert semantics.
 * The other 8 are 1:many lists (a property can have several liens, valuations, etc.).
 */

export const foreclosureStatusEnum = z.enum([
  "PRE_FORECLOSURE",
  "NOTICE_OF_DEFAULT",
  "LIS_PENDENS",
  "AUCTION_SCHEDULED",
  "BANK_OWNED",
  "RESOLVED",
]);
export const upsertForeclosureSchema = z.object({
  propertyId: z.string().min(1),
  status: foreclosureStatusEnum,
  defaultAmount: z.coerce.number().min(0).optional(),
  auctionDate: z.string().optional().or(z.literal("")),
  trusteeName: z.string().max(200).optional().or(z.literal("")),
  caseNumber: z.string().max(120).optional().or(z.literal("")),
});
export type UpsertForeclosureInput = z.infer<typeof upsertForeclosureSchema>;

export const taxSaleStatusEnum = z.enum(["UPCOMING", "SOLD", "REDEEMED", "SURPLUS_AVAILABLE"]);
export const upsertTaxSaleSchema = z.object({
  propertyId: z.string().min(1),
  status: taxSaleStatusEnum,
  saleDate: z.string().optional().or(z.literal("")),
  saleAmount: z.coerce.number().min(0).optional(),
  overbidAmount: z.coerce.number().min(0).optional(),
});
export type UpsertTaxSaleInput = z.infer<typeof upsertTaxSaleSchema>;

export const surplusClaimStatusEnum = z.enum([
  "NEW",
  "FUNDS_VERIFICATION_NEEDED",
  "FUNDS_AVAILABLE",
  "OWNER_RESEARCH",
  "HEIR_RESEARCH",
  "AGREEMENT_SENT",
  "AGREEMENT_SIGNED",
  "CLAIM_PREPARATION",
  "CLAIM_SUBMITTED",
  "COUNTY_REVIEW",
  "PAYMENT_PENDING",
  "PAID",
  "CLOSED",
]);
export const createTaxSurplusClaimSchema = z.object({
  taxSaleId: z.string().min(1),
  status: surplusClaimStatusEnum.default("NEW"),
  surplusAmount: z.coerce.number().min(0).optional(),
});
export type CreateTaxSurplusClaimInput = z.infer<typeof createTaxSurplusClaimSchema>;

export const mortgageSurplusStatusEnum = z.enum([
  "NEW",
  "RESEARCH",
  "AGREEMENT_SENT",
  "AGREEMENT_SIGNED",
  "CLAIM_SUBMITTED",
  "PAID",
  "CLOSED",
]);
export const upsertMortgageSurplusClaimSchema = z.object({
  propertyId: z.string().min(1),
  status: mortgageSurplusStatusEnum,
  surplusAmount: z.coerce.number().min(0).optional(),
});
export type UpsertMortgageSurplusClaimInput = z.infer<typeof upsertMortgageSurplusClaimSchema>;

export const probateStatusEnum = z.enum([
  "NEW",
  "ESTATE_RESEARCH",
  "PR_LOCATED",
  "HEIR_RESEARCH",
  "CONTACT_ATTEMPTED",
  "CONTACTED",
  "APPOINTMENT",
  "OFFER",
  "NEGOTIATION",
  "CONTRACT",
  "CLOSING",
]);
export const upsertProbateCaseSchema = z.object({
  propertyId: z.string().min(1),
  status: probateStatusEnum,
  caseNumber: z.string().max(120).optional().or(z.literal("")),
  county: z.string().max(120).optional().or(z.literal("")),
  filedDate: z.string().optional().or(z.literal("")),
  personalRepresentativeName: z.string().max(200).optional().or(z.literal("")),
});
export type UpsertProbateCaseInput = z.infer<typeof upsertProbateCaseSchema>;

export const shortSaleStatusEnum = z.enum([
  "NEW",
  "SELLER_CONTACTED",
  "APPLICATION_NEEDED",
  "APPLICATION_RECEIVED",
  "AUTHORIZATION_RECEIVED",
  "FINANCIAL_PACKAGE",
  "OFFER_PREPARED",
  "SUBMITTED_TO_LENDER",
  "LENDER_REVIEW",
  "BPO_APPRAISAL",
  "NEGOTIATION",
  "APPROVAL",
  "CLOSING",
  "CLOSED",
]);
export const upsertShortSaleSchema = z.object({
  propertyId: z.string().min(1),
  status: shortSaleStatusEnum,
  lenderName: z.string().max(200).optional().or(z.literal("")),
  loanNumber: z.string().max(120).optional().or(z.literal("")),
});
export type UpsertShortSaleInput = z.infer<typeof upsertShortSaleSchema>;

export const creativeFinanceTypeEnum = z.enum(["SUBJECT_TO", "SELLER_FINANCE", "LEASE_OPTION", "WRAP", "NOVATION"]);
export const upsertCreativeFinanceDealSchema = z.object({
  propertyId: z.string().min(1),
  structureType: creativeFinanceTypeEnum,
  terms: z.string().max(2000).optional().or(z.literal("")),
  monthlyPayment: z.coerce.number().min(0).optional(),
});
export type UpsertCreativeFinanceDealInput = z.infer<typeof upsertCreativeFinanceDealSchema>;

export const createLienSchema = z.object({
  propertyId: z.string().min(1),
  holderName: z.string().min(1, "Holder name is required").max(200),
  amount: z.coerce.number().min(0).optional(),
  filedDate: z.string().optional().or(z.literal("")),
  lienType: z.string().max(80).optional().or(z.literal("")),
});
export type CreateLienInput = z.infer<typeof createLienSchema>;

export const createMortgageSchema = z.object({
  propertyId: z.string().min(1),
  lenderName: z.string().min(1, "Lender name is required").max(200),
  originalAmount: z.coerce.number().min(0).optional(),
  currentBalance: z.coerce.number().min(0).optional(),
  originationDate: z.string().optional().or(z.literal("")),
});
export type CreateMortgageInput = z.infer<typeof createMortgageSchema>;

export const createAuctionSchema = z.object({
  propertyId: z.string().min(1),
  auctionDate: z.string().min(1, "Auction date is required"),
  location: z.string().max(200).optional().or(z.literal("")),
  openingBid: z.coerce.number().min(0).optional(),
  result: z.string().max(200).optional().or(z.literal("")),
});
export type CreateAuctionInput = z.infer<typeof createAuctionSchema>;

export const createValuationSchema = z.object({
  propertyId: z.string().min(1),
  source: z.string().min(1, "Source is required").max(80),
  value: z.coerce.number().min(0, "Enter a value"),
  asOfDate: z.string().min(1, "Date is required"),
});
export type CreateValuationInput = z.infer<typeof createValuationSchema>;

export const createComparableSaleSchema = z.object({
  propertyId: z.string().min(1),
  addressLine1: z.string().min(1, "Address is required").max(200),
  soldPrice: z.coerce.number().min(0, "Enter a sale price"),
  soldDate: z.string().min(1, "Date is required"),
  distanceMiles: z.coerce.number().min(0).optional(),
  squareFeet: z.coerce.number().int().min(0).optional(),
});
export type CreateComparableSaleInput = z.infer<typeof createComparableSaleSchema>;

export const createRepairEstimateSchema = z.object({
  propertyId: z.string().min(1),
  category: z.string().min(1, "Category is required").max(80),
  estimatedCost: z.coerce.number().min(0, "Enter a cost"),
  notes: z.string().max(2000).optional().or(z.literal("")),
});
export type CreateRepairEstimateInput = z.infer<typeof createRepairEstimateSchema>;
