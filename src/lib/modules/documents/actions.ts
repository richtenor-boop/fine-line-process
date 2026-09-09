"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { uploadDocument, deleteDocument } from "./service";
import { uploadDocumentMetaSchema } from "./schema";
import { writeAuditLog } from "@/lib/audit";

export interface UploadDocumentState {
  error?: string;
}

function revalidateScope(leadId?: string, propertyId?: string, dealId?: string) {
  if (leadId) revalidatePath(`/leads/${leadId}`);
  if (propertyId) revalidatePath(`/properties/${propertyId}`);
  if (dealId) revalidatePath(`/deals/${dealId}`);
}

export async function uploadDocumentAction(
  _prevState: UploadDocumentState,
  formData: FormData,
): Promise<UploadDocumentState> {
  const session = await requirePermission("documents:upload");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." };
  }

  const parsed = uploadDocumentMetaSchema.safeParse({
    category: formData.get("category") || undefined,
    leadId: formData.get("leadId")?.toString() || undefined,
    propertyId: formData.get("propertyId")?.toString() || undefined,
    dealId: formData.get("dealId")?.toString() || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  let document;
  try {
    document = await uploadDocument(session.user.organizationId, session.user.id, parsed.data, file);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not upload file." };
  }

  await writeAuditLog({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: "document.uploaded",
    entityType: "Document",
    entityId: document.id,
    newValue: { fileName: document.fileName, category: document.category },
  });

  revalidateScope(parsed.data.leadId, parsed.data.propertyId, parsed.data.dealId);
  return {};
}

export async function deleteDocumentAction(formData: FormData): Promise<void> {
  const session = await requirePermission("documents:delete");
  const documentId = String(formData.get("documentId"));
  const leadId = formData.get("leadId")?.toString();
  const propertyId = formData.get("propertyId")?.toString();
  const dealId = formData.get("dealId")?.toString();

  await deleteDocument(session.user.organizationId, documentId);
  await writeAuditLog({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: "document.deleted",
    entityType: "Document",
    entityId: documentId,
  });
  revalidateScope(leadId, propertyId, dealId);
}
