import { z } from "zod";

export const contactTypeEnum = z.enum([
  "SELLER",
  "BUYER",
  "VENDOR",
  "ATTORNEY",
  "AGENT",
  "HEIR",
  "PERSONAL_REPRESENTATIVE",
  "OTHER",
]);

export const createContactSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(80),
  lastName: z.string().min(1, "Last name is required").max(80),
  type: contactTypeEnum.default("SELLER"),
  company: z.string().max(120).optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
});
export type CreateContactInput = z.infer<typeof createContactSchema>;
