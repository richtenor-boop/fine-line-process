import "server-only";
import { prisma } from "@/lib/db";

interface WriteAuditLogInput {
  organizationId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  previousValue?: unknown;
  newValue?: unknown;
}

export async function writeAuditLog(input: WriteAuditLogInput) {
  await prisma.auditLog.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      previousValue: input.previousValue === undefined ? undefined : (input.previousValue as object),
      newValue: input.newValue === undefined ? undefined : (input.newValue as object),
    },
  });
}
