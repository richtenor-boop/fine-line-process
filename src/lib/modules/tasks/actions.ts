"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { createTask, setTaskStatus, updateTask } from "./service";
import { createTaskSchema, updateTaskSchema } from "./schema";
import { writeAuditLog } from "@/lib/audit";
import { runAutomationsForTrigger } from "@/lib/modules/automations/executor";

export interface CreateTaskState {
  error?: string;
  success?: boolean;
}

export async function createTaskAction(_prevState: CreateTaskState, formData: FormData): Promise<CreateTaskState> {
  const session = await requirePermission("tasks:edit");

  const parsed = createTaskSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const task = await createTask(session.user.organizationId, session.user.id, parsed.data);
  await writeAuditLog({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: "task.created",
    entityType: "Task",
    entityId: task.id,
  });

  revalidatePath("/tasks");
  if (parsed.data.leadId) revalidatePath(`/leads/${parsed.data.leadId}`);
  if (parsed.data.propertyId) revalidatePath(`/properties/${parsed.data.propertyId}`);
  return { success: true };
}

export async function toggleTaskCompleteAction(formData: FormData): Promise<void> {
  const session = await requirePermission("tasks:edit");
  const taskId = String(formData.get("taskId"));
  const nextStatus = formData.get("nextStatus") === "COMPLETED" ? "COMPLETED" : "OPEN";
  const leadId = formData.get("leadId")?.toString();
  const propertyId = formData.get("propertyId")?.toString();

  await setTaskStatus(session.user.organizationId, taskId, nextStatus);
  if (nextStatus === "COMPLETED" && leadId) {
    await runAutomationsForTrigger(session.user.organizationId, "TASK_COMPLETED", leadId);
  }
  revalidatePath("/tasks");
  if (leadId) revalidatePath(`/leads/${leadId}`);
  if (propertyId) revalidatePath(`/properties/${propertyId}`);
}

export interface UpdateTaskState {
  error?: string;
  success?: boolean;
}

export async function updateTaskAction(_prevState: UpdateTaskState, formData: FormData): Promise<UpdateTaskState> {
  const session = await requirePermission("tasks:edit");
  const taskId = String(formData.get("taskId"));

  const parsed = updateTaskSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  await updateTask(session.user.organizationId, taskId, parsed.data);
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  return { success: true };
}
