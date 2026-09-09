import { z } from "zod";

export const documentCategoryEnum = z.enum([
  "PURCHASE_AGREEMENT",
  "AUTHORIZATION",
  "LOI",
  "SHORT_SALE_DOCS",
  "PROBATE_DOCS",
  "FORECLOSURE_DOCS",
  "TAX_DOCS",
  "SURPLUS_AGREEMENT",
  "CLOSING_STATEMENT",
  "PROOF_OF_FUNDS",
  "PHOTO",
  "OTHER",
]);

export const DOCUMENT_CATEGORY_LABELS: Record<z.infer<typeof documentCategoryEnum>, string> = {
  PURCHASE_AGREEMENT: "Purchase Agreement",
  AUTHORIZATION: "Authorization",
  LOI: "LOI",
  SHORT_SALE_DOCS: "Short Sale Docs",
  PROBATE_DOCS: "Probate Docs",
  FORECLOSURE_DOCS: "Foreclosure Docs",
  TAX_DOCS: "Tax Docs",
  SURPLUS_AGREEMENT: "Surplus Agreement",
  CLOSING_STATEMENT: "Closing Statement",
  PROOF_OF_FUNDS: "Proof of Funds",
  PHOTO: "Photo",
  OTHER: "Other",
};

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20MB

export const uploadDocumentMetaSchema = z.object({
  category: documentCategoryEnum.default("OTHER"),
  leadId: z.string().optional(),
  propertyId: z.string().optional(),
  dealId: z.string().optional(),
});
export type UploadDocumentMeta = z.infer<typeof uploadDocumentMetaSchema>;
