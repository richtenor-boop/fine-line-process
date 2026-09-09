import { z } from "zod";

/**
 * One CSV row after the client-side column-mapping step (src/app/(dashboard)/leads/import) has
 * translated arbitrary CSV headers onto this fixed shape. Values are raw strings straight from
 * the CSV cell — coercion and validation happen row-by-row in importLeadsBatch so one bad row
 * doesn't abort the batch (source spec §29: "Generate an error report for rejected rows").
 */
export const importRowSchema = z.object({
  fullName: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  addressLine1: z.string().optional(),
  city: z.string().optional(),
  county: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  motivation: z.string().optional(),
  timeline: z.string().optional(),
  askingPrice: z.string().optional(),
  leadSourceName: z.string().optional(),
  tags: z.string().optional(), // comma-separated
});
export type ImportRow = z.infer<typeof importRowSchema>;

export const IMPORT_TARGET_FIELDS = [
  { key: "fullName", label: "Full Name" },
  { key: "firstName", label: "First Name" },
  { key: "lastName", label: "Last Name" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "addressLine1", label: "Property Address" },
  { key: "city", label: "City" },
  { key: "county", label: "County" },
  { key: "state", label: "State" },
  { key: "zip", label: "ZIP" },
  { key: "motivation", label: "Motivation (Low/Medium/High)" },
  { key: "timeline", label: "Timeline" },
  { key: "askingPrice", label: "Asking Price" },
  { key: "leadSourceName", label: "Lead Source" },
  { key: "tags", label: "Tags (comma-separated)" },
] as const satisfies { key: keyof ImportRow; label: string }[];

export const duplicateStrategyEnum = z.enum(["skip", "create"]);
export type DuplicateStrategy = z.infer<typeof duplicateStrategyEnum>;

export const importBatchSchema = z.object({
  rows: z.array(importRowSchema).min(1).max(200), // client chunks into batches of this size
  duplicateStrategy: duplicateStrategyEnum,
});
export type ImportBatchInput = z.infer<typeof importBatchSchema>;

export interface ImportRowResult {
  rowIndex: number;
  status: "created" | "skipped_duplicate" | "error";
  reason?: string;
}
