import { z } from "zod";

export const leadMotivationEnum = z.enum(["LOW", "MEDIUM", "HIGH", "UNKNOWN"]);

// Flat shape matching a single "New Lead" form's FormData — a lead is created together with its
// contact (always required) and, optionally, the property it concerns. Each side can point at an
// existing record or create one inline. Phase 4 adds real duplicate detection; Phase 2 always
// creates a new Contact/Property when "new" is chosen — see docs/05-mvp-plan.md.
export const createLeadSchema = z
  .object({
    contactMode: z.enum(["existing", "new"]),
    contactId: z.string().optional(),
    firstName: z.string().max(80).optional(),
    lastName: z.string().max(80).optional(),
    phone: z.string().max(30).optional().or(z.literal("")),
    email: z.string().email().optional().or(z.literal("")),

    propertyMode: z.enum(["none", "existing", "new"]).default("none"),
    propertyId: z.string().optional(),
    addressLine1: z.string().max(200).optional(),
    city: z.string().max(120).optional(),
    state: z.string().max(2).optional(),
    zip: z.string().max(10).optional(),

    leadSourceName: z.string().max(80).optional().or(z.literal("")),
    assignedUserId: z.string().optional().or(z.literal("")),
    motivation: leadMotivationEnum.default("UNKNOWN"),
    timeline: z.string().max(120).optional().or(z.literal("")),
    askingPrice: z.coerce.number().min(0).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.contactMode === "existing" && !data.contactId) {
      ctx.addIssue({ code: "custom", path: ["contactId"], message: "Select a contact" });
    }
    if (data.contactMode === "new" && (!data.firstName || !data.lastName)) {
      ctx.addIssue({ code: "custom", path: ["firstName"], message: "First and last name are required" });
    }
    if (data.propertyMode === "existing" && !data.propertyId) {
      ctx.addIssue({ code: "custom", path: ["propertyId"], message: "Select a property" });
    }
    if (data.propertyMode === "new" && (!data.addressLine1 || !data.city || !data.state || !data.zip)) {
      ctx.addIssue({ code: "custom", path: ["addressLine1"], message: "Full address is required" });
    }
  });
export type CreateLeadInput = z.infer<typeof createLeadSchema>;

export const updateLeadDetailsSchema = z.object({
  motivation: leadMotivationEnum,
  timeline: z.string().max(120).optional().or(z.literal("")),
  askingPrice: z.coerce.number().min(0).optional(),
  offerAmount: z.coerce.number().min(0).optional(),
  nextFollowUpAt: z.string().optional().or(z.literal("")),
});
export type UpdateLeadDetailsInput = z.infer<typeof updateLeadDetailsSchema>;
