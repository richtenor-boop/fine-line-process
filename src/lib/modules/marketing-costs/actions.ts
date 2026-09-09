"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { createMarketingCost, deleteMarketingCost } from "./service";
import { createMarketingCostSchema } from "./schema";

export interface CreateMarketingCostState {
  error?: string;
}

export async function createMarketingCostAction(
  _prevState: CreateMarketingCostState,
  formData: FormData,
): Promise<CreateMarketingCostState> {
  const session = await requirePermission("campaigns:manage");

  const parsed = createMarketingCostSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  await createMarketingCost(session.user.organizationId, session.user.id, parsed.data);
  revalidatePath("/reports/financials");
  return {};
}

export async function deleteMarketingCostAction(formData: FormData): Promise<void> {
  const session = await requirePermission("campaigns:manage");
  const costId = String(formData.get("costId"));

  await deleteMarketingCost(session.user.organizationId, costId);
  revalidatePath("/reports/financials");
}
