import "server-only";
import { prisma } from "@/lib/db";
import { getStorageAdapter } from "@/lib/storage";
import { MAX_UPLOAD_BYTES } from "./schema";
import type { UploadDocumentMeta } from "./schema";
import type { DocumentCategory } from "@prisma/client";

export async function uploadDocument(
  organizationId: string,
  uploadedByUserId: string,
  meta: UploadDocumentMeta,
  file: File,
) {
  if (!meta.leadId && !meta.propertyId && !meta.dealId) {
    throw new Error("A document must be attached to a lead, property, or deal.");
  }
  if (file.size === 0) throw new Error("File is empty.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("File is larger than the 20MB limit.");

  const buffer = Buffer.from(await file.arrayBuffer());
  const stored = await getStorageAdapter().putObject({ organizationId, fileName: file.name, data: buffer });

  return prisma.document.create({
    data: {
      organizationId,
      leadId: meta.leadId || null,
      propertyId: meta.propertyId || null,
      dealId: meta.dealId || null,
      category: meta.category,
      fileName: file.name,
      storageKey: stored.storageKey,
      mimeType: file.type || null,
      sizeBytes: stored.sizeBytes,
      uploadedByUserId,
    },
  });
}

export async function listDocuments(
  organizationId: string,
  scope: { leadId?: string; propertyId?: string; dealId?: string },
) {
  return prisma.document.findMany({
    where: {
      organizationId,
      deletedAt: null,
      ...(scope.leadId ? { leadId: scope.leadId } : {}),
      ...(scope.propertyId ? { propertyId: scope.propertyId } : {}),
      ...(scope.dealId ? { dealId: scope.dealId } : {}),
    },
    include: { uploadedByUser: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function listAllDocuments(organizationId: string, category?: DocumentCategory) {
  return prisma.document.findMany({
    where: { organizationId, deletedAt: null, ...(category ? { category } : {}) },
    include: {
      uploadedByUser: true,
      lead: { include: { contact: true } },
      property: true,
      deal: { include: { property: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function getDocument(organizationId: string, documentId: string) {
  return prisma.document.findFirst({ where: { id: documentId, organizationId, deletedAt: null } });
}

export async function deleteDocument(organizationId: string, documentId: string) {
  const document = await prisma.document.findFirst({ where: { id: documentId, organizationId, deletedAt: null } });
  if (!document) throw new Error("Document does not belong to this organization.");

  await getStorageAdapter().deleteObject(document.storageKey);
  await prisma.document.update({ where: { id: documentId }, data: { deletedAt: new Date() } });
}
