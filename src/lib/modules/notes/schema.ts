import { z } from "zod";

export const createNoteSchema = z.object({
  body: z.string().min(1, "Note cannot be empty").max(5000),
  leadId: z.string().optional(),
  propertyId: z.string().optional(),
  dealId: z.string().optional(),
});
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
