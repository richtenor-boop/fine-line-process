import { z } from "zod";
import { blankToUndefined } from "@/lib/zod-helpers";

export const buyerStrategyEnum = z.enum(["FLIP", "RENTAL", "WHOLESALE", "BRRRR", "OTHER"]);
export const propertyTypeEnum = z.enum([
  "SINGLE_FAMILY",
  "MULTI_FAMILY",
  "CONDO",
  "TOWNHOME",
  "MOBILE_HOME",
  "LAND",
  "COMMERCIAL",
  "OTHER",
]);

export const createBuyerSchema = z
  .object({
    contactMode: z.enum(["existing", "new"]),
    contactId: z.string().optional(),
    firstName: z.string().max(80).optional(),
    lastName: z.string().max(80).optional(),
    phone: z.string().max(30).optional().or(z.literal("")),
    email: z.string().email().optional().or(z.literal("")),

    companyName: z.string().max(120).optional().or(z.literal("")),
    markets: z.string().max(400).optional().or(z.literal("")), // comma-separated
    zipCodes: z.string().max(400).optional().or(z.literal("")), // comma-separated
    propertyTypes: z.array(propertyTypeEnum).optional().default([]),
    minPrice: blankToUndefined(z.coerce.number().min(0).optional()),
    maxPrice: blankToUndefined(z.coerce.number().min(0).optional()),
    minBedrooms: blankToUndefined(z.coerce.number().int().min(0).optional()),
    maxRehabBudget: blankToUndefined(z.coerce.number().min(0).optional()),
    strategy: buyerStrategyEnum.optional(),
    isCashBuyer: z.coerce.boolean().default(false),
  })
  .refine((data) => data.contactMode === "existing" ? !!data.contactId : !!(data.firstName && data.lastName), {
    message: "Provide a contact",
    path: ["contactId"],
  });
export type CreateBuyerInput = z.infer<typeof createBuyerSchema>;
