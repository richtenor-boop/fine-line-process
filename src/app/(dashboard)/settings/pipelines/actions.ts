"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import {
  createPipeline,
  addStage,
  renameStage,
  moveStage,
  deleteStage,
  setDefaultPipeline,
} from "@/lib/modules/pipelines/service";
import { createPipelineSchema, createStageSchema } from "@/lib/modules/pipelines/schema";

export interface CreatePipelineState {
  error?: string;
}

export async function createPipelineAction(
  _prevState: CreatePipelineState,
  formData: FormData,
): Promise<CreatePipelineState> {
  const session = await requirePermission("pipelines:manage");

  const parsed = createPipelineSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  await createPipeline(session.user.organizationId, parsed.data);
  revalidatePath("/settings/pipelines");
  return {};
}

export interface AddStageState {
  error?: string;
}

export async function addStageAction(_prevState: AddStageState, formData: FormData): Promise<AddStageState> {
  const session = await requirePermission("pipelines:manage");

  const parsed = createStageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  await addStage(session.user.organizationId, parsed.data.pipelineId, parsed.data.name);
  revalidatePath("/settings/pipelines");
  return {};
}

export async function renameStageAction(formData: FormData): Promise<void> {
  const session = await requirePermission("pipelines:manage");
  const stageId = String(formData.get("stageId"));
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await renameStage(session.user.organizationId, stageId, name);
  revalidatePath("/settings/pipelines");
}

export async function moveStageAction(formData: FormData): Promise<void> {
  const session = await requirePermission("pipelines:manage");
  const stageId = String(formData.get("stageId"));
  const direction = formData.get("direction") === "up" ? "up" : "down";

  await moveStage(session.user.organizationId, stageId, direction);
  revalidatePath("/settings/pipelines");
}

export interface DeleteStageState {
  error?: string;
}

export async function deleteStageAction(_prevState: DeleteStageState, formData: FormData): Promise<DeleteStageState> {
  const session = await requirePermission("pipelines:manage");
  const stageId = String(formData.get("stageId"));

  try {
    await deleteStage(session.user.organizationId, stageId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not delete stage." };
  }
  revalidatePath("/settings/pipelines");
  return {};
}

export async function setDefaultPipelineAction(formData: FormData): Promise<void> {
  const session = await requirePermission("pipelines:manage");
  const pipelineId = String(formData.get("pipelineId"));

  await setDefaultPipeline(session.user.organizationId, pipelineId);
  revalidatePath("/settings/pipelines");
}
