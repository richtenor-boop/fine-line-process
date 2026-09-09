import { z } from "zod";

export const pipelineTypeEnum = z.enum([
  "GENERAL",
  "PRE_FORECLOSURE",
  "TAX_SURPLUS",
  "PROBATE",
  "SHORT_SALE",
  "DISPOSITIONS",
]);

export const createPipelineSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  type: pipelineTypeEnum,
  useTemplate: z.coerce.boolean().default(true),
});
export type CreatePipelineInput = z.infer<typeof createPipelineSchema>;

export const createStageSchema = z.object({
  pipelineId: z.string().min(1),
  name: z.string().min(1, "Stage name is required").max(80),
});
export type CreateStageInput = z.infer<typeof createStageSchema>;
