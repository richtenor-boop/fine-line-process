"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { createAutomation, toggleAutomationActive, deleteAutomation, addStep, removeStep } from "./service";
import { createAutomationSchema, addStepSchema } from "./schema";
import { writeAuditLog } from "@/lib/audit";

export interface CreateAutomationState {
  error?: string;
}

export async function createAutomationAction(
  _prevState: CreateAutomationState,
  formData: FormData,
): Promise<CreateAutomationState> {
  const session = await requirePermission("automations:manage");

  const parsed = createAutomationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const automation = await createAutomation(session.user.organizationId, session.user.id, parsed.data);
  await writeAuditLog({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: "automation.created",
    entityType: "Automation",
    entityId: automation.id,
  });
  redirect(`/automations/${automation.id}`);
}

export async function toggleAutomationAction(formData: FormData): Promise<void> {
  const session = await requirePermission("automations:manage");
  const automationId = String(formData.get("automationId"));
  const isActive = formData.get("isActive") === "true";

  await toggleAutomationActive(session.user.organizationId, automationId, isActive);
  await writeAuditLog({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: isActive ? "automation.activated" : "automation.deactivated",
    entityType: "Automation",
    entityId: automationId,
  });
  revalidatePath(`/automations/${automationId}`);
  revalidatePath("/automations");
}

export async function deleteAutomationAction(formData: FormData): Promise<void> {
  const session = await requirePermission("automations:manage");
  const automationId = String(formData.get("automationId"));

  await deleteAutomation(session.user.organizationId, automationId);
  revalidatePath("/automations");
}

export interface AddStepState {
  error?: string;
}

export async function addStepAction(_prevState: AddStepState, formData: FormData): Promise<AddStepState> {
  const session = await requirePermission("automations:manage");

  const parsed = addStepSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  await addStep(session.user.organizationId, parsed.data);
  revalidatePath(`/automations/${parsed.data.automationId}`);
  return {};
}

export async function removeStepAction(formData: FormData): Promise<void> {
  const session = await requirePermission("automations:manage");
  const stepId = String(formData.get("stepId"));
  const automationId = String(formData.get("automationId"));

  await removeStep(session.user.organizationId, stepId);
  revalidatePath(`/automations/${automationId}`);
}
