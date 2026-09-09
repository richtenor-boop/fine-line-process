import { z } from "zod";

export const createMarketingCostSchema = z.object({
  description: z.string().min(1, "Description is required").max(200),
  amount: z.coerce.number().min(0, "Enter an amount"),
  incurredOn: z.string().min(1, "Date is required"),
  campaignId: z.string().optional().or(z.literal("")),
});
export type CreateMarketingCostInput = z.infer<typeof createMarketingCostSchema>;
