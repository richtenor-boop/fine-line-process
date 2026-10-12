import { z } from "zod";

// Blank form fields arrive as "" — treat them as "not entered" (null), never as 0.
const optionalMoney = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? null : v),
  z.coerce.number().min(0).max(1_000_000_000).nullable(),
);
const percent = (fallback: number) =>
  z.preprocess((v) => (v === "" || v === undefined || v === null ? fallback : v), z.coerce.number().min(0).max(100));

export const upsertDealAnalysisSchema = z.object({
  propertyId: z.string().min(1),
  arv: optionalMoney,
  repairCost: optionalMoney,
  purchasePrice: optionalMoney,
  maoPercent: percent(70),
  assignmentFee: optionalMoney,
  closingCostPercent: percent(2),
  sellingCostPercent: percent(8),
  holdingMonths: z.preprocess((v) => (v === "" || v == null ? 6 : v), z.coerce.number().int().min(0).max(120)),
  monthlyHoldingCost: optionalMoney,
  monthlyRent: optionalMoney,
  monthlyExpenses: optionalMoney,
});
export type UpsertDealAnalysisInput = z.infer<typeof upsertDealAnalysisSchema>;
