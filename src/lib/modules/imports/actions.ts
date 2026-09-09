"use server";

import { requirePermission } from "@/lib/rbac";
import { importLeadsBatch } from "./service";
import { importBatchSchema } from "./schema";
import { writeAuditLog } from "@/lib/audit";
import type { ImportRow, DuplicateStrategy, ImportRowResult } from "./schema";

/** Callable directly from the client import wizard, one batch (≤200 rows) at a time — see
 * src/app/(dashboard)/leads/import/import-wizard.tsx. */
export async function importLeadsBatchAction(
  rows: ImportRow[],
  duplicateStrategy: DuplicateStrategy,
  rowIndexOffset: number,
): Promise<ImportRowResult[]> {
  const session = await requirePermission("leads:edit");

  const parsed = importBatchSchema.safeParse({ rows, duplicateStrategy });
  if (!parsed.success) {
    return rows.map((_, i) => ({ rowIndex: rowIndexOffset + i, status: "error", reason: "Invalid row data." }));
  }

  const results = await importLeadsBatch(
    session.user.organizationId,
    session.user.id,
    parsed.data.rows,
    rowIndexOffset,
    parsed.data.duplicateStrategy,
  );

  const created = results.filter((r) => r.status === "created").length;
  if (created > 0) {
    await writeAuditLog({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: "leads.csv_import_batch",
      entityType: "Lead",
      entityId: "batch",
      newValue: { created, batchSize: rows.length },
    });
  }

  return results;
}
