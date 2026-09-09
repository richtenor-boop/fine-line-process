import { z } from "zod";

export const callDispositionEnum = z.enum([
  "INTERESTED",
  "FOLLOW_UP",
  "APPOINTMENT_SET",
  "NOT_INTERESTED",
  "WRONG_NUMBER",
  "DISCONNECTED",
  "DNC",
  "NEEDS_MORE_INFO",
]);

export const logCallSchema = z.object({
  leadId: z.string().min(1),
  phoneNumberId: z.string().min(1, "Select which number was called"),
  direction: z.enum(["INBOUND", "OUTBOUND"]),
  durationSeconds: z.coerce.number().int().min(0).optional(),
  disposition: callDispositionEnum.optional(),
  notes: z.string().max(2000).optional().or(z.literal("")),
});
export type LogCallInput = z.infer<typeof logCallSchema>;

export const sendSmsSchema = z.object({
  leadId: z.string().min(1),
  phoneNumberId: z.string().min(1, "Select a number to text"),
  body: z.string().min(1, "Message cannot be empty").max(1600),
});
export type SendSmsInput = z.infer<typeof sendSmsSchema>;

export const sendEmailSchema = z.object({
  leadId: z.string().min(1),
  emailAddressId: z.string().min(1, "Select an email address"),
  subject: z.string().min(1, "Subject is required").max(200),
  bodyHtml: z.string().min(1, "Message cannot be empty").max(20000),
});
export type SendEmailInput = z.infer<typeof sendEmailSchema>;

// Manual "simulate inbound" helper — see src/lib/modules/communications/service.ts doc comment.
export const logInboundSchema = z.object({
  leadId: z.string().min(1),
  phoneNumberId: z.string().optional(),
  emailAddressId: z.string().optional(),
  channel: z.enum(["SMS", "EMAIL"]),
  body: z.string().min(1).max(20000),
  subject: z.string().max(200).optional(),
});
export type LogInboundInput = z.infer<typeof logInboundSchema>;
