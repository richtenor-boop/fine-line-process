import { z } from "zod";

export const createLeadFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  headline: z.string().trim().max(160).optional().or(z.literal("")),
  leadSourceName: z.string().trim().min(1, "Lead source is required").max(80),
  assignedUserId: z.string().optional().or(z.literal("")),
  thankYouMessage: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type CreateLeadFormInput = z.infer<typeof createLeadFormSchema>;

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

/** What a member of the public submits. Deliberately small — the fewer fields, the more sellers
 * finish the form. Name + one way to reach them is the minimum a lead is useful with. */
export const publicSubmissionSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required").max(80),
    lastName: z.string().trim().min(1, "Last name is required").max(80),
    phone: optionalText(30),
    email: z.string().trim().email("Enter a valid email").max(200).optional().or(z.literal("")),
    addressLine1: optionalText(200),
    city: optionalText(120),
    state: optionalText(2),
    zip: optionalText(10),
    timeline: optionalText(120),
    message: optionalText(2000),
  })
  .superRefine((data, ctx) => {
    if (!data.phone && !data.email) {
      ctx.addIssue({ code: "custom", path: ["phone"], message: "Please give us a phone number or email so we can reach you" });
    }
    const addressParts = [data.addressLine1, data.city, data.state, data.zip];
    if (addressParts.some(Boolean) && !addressParts.every(Boolean)) {
      ctx.addIssue({ code: "custom", path: ["addressLine1"], message: "Please complete the full property address" });
    }
  });
export type PublicSubmissionInput = z.infer<typeof publicSubmissionSchema>;

/** Submissions allowed from one IP across all forms per rolling hour before we refuse. */
export const SUBMISSIONS_PER_IP_PER_HOUR = 5;
