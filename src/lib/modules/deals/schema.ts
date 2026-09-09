import { z } from "zod";

export const offerStatusEnum = z.enum(["DRAFT", "SENT", "COUNTERED", "ACCEPTED", "REJECTED", "WITHDRAWN"]);
export const contractStatusEnum = z.enum(["DRAFT", "SENT", "SIGNED", "VOIDED"]);
export const dealStageEnum = z.enum([
  "UNDER_CONTRACT",
  "DUE_DILIGENCE",
  "DISPOSITIONS_AVAILABLE",
  "DISPOSITIONS_BUYER_OUTREACH",
  "DISPOSITIONS_OFFERS_RECEIVED",
  "ASSIGNMENT_CONTRACT",
  "CLOSING",
  "CLOSED_WON",
  "CLOSED_LOST",
]);

export const DEAL_STAGE_LABELS: Record<z.infer<typeof dealStageEnum>, string> = {
  UNDER_CONTRACT: "Under Contract",
  DUE_DILIGENCE: "Due Diligence",
  DISPOSITIONS_AVAILABLE: "Available",
  DISPOSITIONS_BUYER_OUTREACH: "Buyer Outreach",
  DISPOSITIONS_OFFERS_RECEIVED: "Offers Received",
  ASSIGNMENT_CONTRACT: "Assignment/Contract",
  CLOSING: "Closing",
  CLOSED_WON: "Closed Won",
  CLOSED_LOST: "Closed Lost",
};

export const createOfferSchema = z.object({
  leadId: z.string().min(1),
  amount: z.coerce.number().min(0, "Enter an amount"),
  notes: z.string().max(2000).optional().or(z.literal("")),
});
export type CreateOfferInput = z.infer<typeof createOfferSchema>;

export const transactionTypeEnum = z.enum([
  "ACQUISITION_COST",
  "DISPOSITION_PROCEEDS",
  "ASSIGNMENT_FEE",
  "REPAIR_COST",
  "CLOSING_COST",
  "OTHER",
]);

export const addTransactionSchema = z.object({
  dealId: z.string().min(1),
  type: transactionTypeEnum,
  amount: z.coerce.number(),
  occurredOn: z.string().min(1, "Date is required"),
});
export type AddTransactionInput = z.infer<typeof addTransactionSchema>;
