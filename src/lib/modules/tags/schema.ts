import { z } from "zod";

export const createTagSchema = z.object({
  name: z.string().min(1, "Tag name is required").max(60),
  color: z.string().max(20).optional().or(z.literal("")),
});
export type CreateTagInput = z.infer<typeof createTagSchema>;
