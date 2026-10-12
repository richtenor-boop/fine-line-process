import { z } from "zod";
import { blankToUndefined } from "@/lib/zod-helpers";

export const contractTypeEnum = z.enum(["CASH", "NOVATION", "SUBJECT_TO"]);
export type ContractType = z.infer<typeof contractTypeEnum>;

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  CASH: "Cash Purchase Agreement",
  NOVATION: "Novation Agreement",
  SUBJECT_TO: "Subject-To Purchase Agreement",
};

const money = (label: string) => z.coerce.number({ message: `${label} must be a number` }).min(0).max(1_000_000_000);
const optionalMoney = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? undefined : v),
  z.coerce.number().min(0).max(1_000_000_000).optional(),
);
const text = (max: number) => z.string().trim().max(max);

export const generateContractSchema = z
  .object({
    propertyId: z.string().min(1),
    leadId: z.string().optional().or(z.literal("")),
    type: contractTypeEnum,
    sellerNames: text(300).min(1, "Seller name(s) are required"),
    buyerName: text(200).min(1, "Buyer name is required"),
    propertyAddress: text(300).min(1, "Property address is required"),
    parcelNumber: text(80).optional().or(z.literal("")),
    purchasePrice: money("Purchase price"),
    earnestMoney: money("Earnest money"),
    closingAgent: text(200).min(1, "Closing attorney / title company is required"),
    closingDate: z.string().min(1, "Closing date is required"),
    inspectionDays: z.coerce.number().int().min(0).max(120),
    // Novation
    marketingDays: blankToUndefined(z.coerce.number().int().min(0).max(730).optional()),
    repairBudget: optionalMoney,
    // Subject-To
    lenderName: text(200).optional().or(z.literal("")),
    loanNumber: text(80).optional().or(z.literal("")),
    loanBalance: optionalMoney,
    monthlyPayment: optionalMoney,
    loanArrears: optionalMoney,
    cashToSeller: optionalMoney,
    additionalTerms: text(4000).optional().or(z.literal("")),
  })
  .superRefine((d, ctx) => {
    if (d.type === "SUBJECT_TO") {
      if (!d.lenderName) ctx.addIssue({ code: "custom", path: ["lenderName"], message: "Lender name is required for Subject-To" });
      if (d.loanBalance === undefined)
        ctx.addIssue({ code: "custom", path: ["loanBalance"], message: "Existing loan balance is required for Subject-To" });
      if (d.monthlyPayment === undefined)
        ctx.addIssue({ code: "custom", path: ["monthlyPayment"], message: "Monthly payment is required for Subject-To" });
    }
    if (d.type === "NOVATION" && !d.marketingDays) {
      ctx.addIssue({ code: "custom", path: ["marketingDays"], message: "Marketing period is required for a novation" });
    }
  });
export type GenerateContractInput = z.infer<typeof generateContractSchema>;
