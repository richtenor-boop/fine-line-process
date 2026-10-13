import { z } from "zod";
import { blankToUndefined } from "@/lib/zod-helpers";

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

export const createPropertySchema = z.object({
  addressLine1: z.string().min(1, "Address is required").max(200),
  addressLine2: z.string().max(200).optional().or(z.literal("")),
  city: z.string().min(1, "City is required").max(120),
  county: z.string().max(120).optional().or(z.literal("")),
  state: z.string().min(2, "State is required").max(2),
  zip: z.string().min(5, "ZIP is required").max(10),
  propertyType: propertyTypeEnum.default("SINGLE_FAMILY"),
  bedrooms: blankToUndefined(z.coerce.number().int().min(0).optional()),
  bathrooms: blankToUndefined(z.coerce.number().min(0).optional()),
  squareFeet: blankToUndefined(z.coerce.number().int().min(0).optional()),
  yearBuilt: blankToUndefined(z.coerce.number().int().min(1600).max(2100).optional()),
  estimatedValue: blankToUndefined(z.coerce.number().min(0).optional()),
  mortgageBalance: blankToUndefined(z.coerce.number().min(0).optional()),
});
export type CreatePropertyInput = z.infer<typeof createPropertySchema>;

// Owner fields are optional and only used when adding an owner inline (not searching an existing
// contact) — see the "new vs. existing contact" toggle on the Property/Lead forms.
export const newOwnerContactSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  phone: z.string().max(30).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
});
export type NewOwnerContactInput = z.infer<typeof newOwnerContactSchema>;
