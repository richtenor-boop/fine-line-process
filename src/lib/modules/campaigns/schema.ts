import { z } from "zod";

export const campaignChannelEnum = z.enum(["SMS", "EMAIL", "PHONE_TASK", "VOICEMAIL", "DIRECT_MAIL_TASK"]);

export const createCampaignSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  respectQuietHours: z.coerce.boolean().default(true),
  respectBusinessHours: z.coerce.boolean().default(true),
});
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const addCampaignStepSchema = z.object({
  campaignId: z.string().min(1),
  channel: campaignChannelEnum,
  delayDays: z.coerce.number().int().min(0),
  subject: z.string().max(200).optional().or(z.literal("")),
  templateBody: z.string().max(20000).optional().or(z.literal("")),
});
export type AddCampaignStepInput = z.infer<typeof addCampaignStepSchema>;
