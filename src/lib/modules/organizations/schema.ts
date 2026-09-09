import { z } from "zod";

export const registerSchema = z.object({
  organizationName: z.string().min(2, "Organization name is required").max(120),
  ownerName: z.string().min(2, "Your name is required").max(120),
  ownerEmail: z.string().email("Enter a valid email"),
  ownerPassword: z.string().min(10, "Password must be at least 10 characters"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(120),
  timezone: z.string().min(1),
});
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
