"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { createBuyer, deleteBuyer } from "./service";
import { createBuyerSchema } from "./schema";
import { writeAuditLog } from "@/lib/audit";

export interface CreateBuyerState {
  error?: string;
}

export async function createBuyerAction(_prevState: CreateBuyerState, formData: FormData): Promise<CreateBuyerState> {
  const session = await requirePermission("buyers:edit");

  const raw = Object.fromEntries(formData);
  const propertyTypes = formData.getAll("propertyTypes").map(String);
  const parsed = createBuyerSchema.safeParse({ ...raw, propertyTypes });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };

  let buyer;
  try {
    buyer = await createBuyer(session.user.organizationId, session.user.id, parsed.data);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not create buyer." };
  }

  await writeAuditLog({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: "buyer.created",
    entityType: "Buyer",
    entityId: buyer.id,
  });

  redirect(`/buyers/${buyer.id}`);
}

export async function deleteBuyerAction(formData: FormData): Promise<void> {
  const session = await requirePermission("buyers:edit");
  const buyerId = String(formData.get("buyerId"));

  await deleteBuyer(session.user.organizationId, buyerId);
  revalidatePath("/buyers");
}
