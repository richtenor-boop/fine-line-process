"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { upsertDealAnalysisSchema } from "./schema";
import { upsertDealAnalysis } from "./service";

export interface SaveDealAnalysisState {
  error?: string;
  savedAt?: number;
}

export async function saveDealAnalysisAction(
  _prevState: SaveDealAnalysisState,
  formData: FormData,
): Promise<SaveDealAnalysisState> {
  const session = await requirePermission("properties:edit");

  const parsed = upsertDealAnalysisSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the numbers and try again." };

  let record;
  try {
    record = await upsertDealAnalysis(session.user.organizationId, session.user.id, parsed.data);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save the analysis." };
  }

  await writeAuditLog({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: "deal_analysis.updated",
    entityType: "DealAnalysis",
    entityId: record.id,
  });
  revalidatePath(`/properties/${parsed.data.propertyId}`);
  return { savedAt: Date.now() };
}
