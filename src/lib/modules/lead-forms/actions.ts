"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { createLeadFormSchema } from "./schema";
import { createLeadForm, setLeadFormActive } from "./service";

export interface CreateLeadFormState {
  error?: string;
}

export async function createLeadFormAction(_prev: CreateLeadFormState, formData: FormData): Promise<CreateLeadFormState> {
  const session = await requirePermission("campaigns:manage");
  const parsed = createLeadFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };

  let form;
  try {
    form = await createLeadForm(session.user.organizationId, session.user.id, parsed.data);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not create the form." };
  }

  await writeAuditLog({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: "lead_form.created",
    entityType: "LeadForm",
    entityId: form.id,
  });
  revalidatePath("/settings/lead-forms");
  return {};
}

export async function toggleLeadFormAction(formData: FormData): Promise<void> {
  const session = await requirePermission("campaigns:manage");
  const formId = String(formData.get("formId"));
  const isActive = formData.get("isActive") === "true";

  await setLeadFormActive(session.user.organizationId, formId, isActive);
  await writeAuditLog({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: isActive ? "lead_form.activated" : "lead_form.deactivated",
    entityType: "LeadForm",
    entityId: formId,
  });
  revalidatePath("/settings/lead-forms");
}
