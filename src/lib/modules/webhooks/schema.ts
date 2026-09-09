import { z } from "zod";

export const createWebhookSchema = z.object({
  url: z.string().url("Enter a valid URL"),
  event: z.string().min(1, "Event label is required").max(80),
});
export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;
