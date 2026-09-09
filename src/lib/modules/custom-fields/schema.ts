import { z } from "zod";

// CONTACT and DEAL are modeled in the schema for future phases but have no UI to fill their
// values yet (Contact has no dedicated page; Deal ships in Phase 7) — restrict the definable
// entities to what Phase 2 actually renders, so an admin can't define a field nobody can fill in.
export const definableEntityEnum = z.enum(["LEAD", "PROPERTY"]);

export const fieldTypeEnum = z.enum(["TEXT", "NUMBER", "DATE", "BOOLEAN", "SELECT"]);

export const createCustomFieldSchema = z.object({
  entity: definableEntityEnum,
  label: z.string().min(1, "Label is required").max(80),
  fieldType: fieldTypeEnum,
  options: z.string().optional(), // comma-separated, only used when fieldType === "SELECT"
  isRequired: z.coerce.boolean().default(false),
});
export type CreateCustomFieldInput = z.infer<typeof createCustomFieldSchema>;
