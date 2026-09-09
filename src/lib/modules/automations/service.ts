import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type { CreateAutomationInput, AddStepInput, Condition } from "./schema";

export async function listAutomations(organizationId: string) {
  return prisma.automation.findMany({
    where: { organizationId },
    include: { steps: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAutomation(organizationId: string, automationId: string) {
  return prisma.automation.findFirst({
    where: { id: automationId, organizationId },
    include: { steps: { orderBy: { order: "asc" } } },
  });
}

export async function createAutomation(organizationId: string, createdById: string, input: CreateAutomationInput) {
  return prisma.automation.create({
    data: { organizationId, name: input.name, triggerType: input.triggerType, createdById, isActive: false },
  });
}

export async function toggleAutomationActive(organizationId: string, automationId: string, isActive: boolean) {
  const automation = await prisma.automation.findFirst({ where: { id: automationId, organizationId } });
  if (!automation) throw new Error("Automation does not belong to this organization.");
  await prisma.automation.update({ where: { id: automationId }, data: { isActive } });
}

export async function deleteAutomation(organizationId: string, automationId: string) {
  const automation = await prisma.automation.findFirst({ where: { id: automationId, organizationId } });
  if (!automation) throw new Error("Automation does not belong to this organization.");
  await prisma.automation.delete({ where: { id: automationId } });
}

/** Translates the flat add-step form into the actionConfig JSON shape the executor expects. */
function buildActionConfig(input: AddStepInput): Prisma.InputJsonObject {
  switch (input.actionType) {
    case "SEND_SMS":
      return { body: input.smsBody ?? "" };
    case "SEND_EMAIL":
      return { subject: input.emailSubject ?? "", bodyHtml: input.emailBody ?? "" };
    case "CREATE_TASK":
      return {
        title: input.taskTitle ?? "",
        dueInDays: input.taskDueInDays ?? 0,
        assignedUserId: input.taskAssignedUserId || undefined,
      };
    case "ASSIGN_USER":
      return { userId: input.assignUserId ?? "" };
    case "CHANGE_STAGE":
      return { stageId: input.changeStageId ?? "" };
    case "ADD_TAG":
    case "REMOVE_TAG":
      return { tagName: input.tagName ?? "" };
    case "CREATE_NOTIFICATION":
      return {
        title: input.notificationTitle ?? "",
        body: input.notificationBody || undefined,
        userId: input.notificationUserId || undefined,
      };
    case "CREATE_APPOINTMENT":
      return {
        type: input.appointmentType || "CONSULTATION",
        daysFromNow: input.appointmentDaysFromNow ?? 1,
        durationMinutes: input.appointmentDurationMinutes ?? 30,
      };
    case "START_CAMPAIGN":
    case "STOP_CAMPAIGN":
      return { campaignId: input.campaignId ?? "" };
    case "SEND_WEBHOOK":
      return { webhookId: input.webhookId ?? "" };
    case "GENERATE_AI_SUMMARY":
      return {}; // no fields — summarizes whatever activity exists on the lead at trigger time
  }
}

export async function addStep(organizationId: string, input: AddStepInput) {
  const automation = await prisma.automation.findFirst({ where: { id: input.automationId, organizationId } });
  if (!automation) throw new Error("Automation does not belong to this organization.");

  const maxOrder = await prisma.automationStep.aggregate({
    where: { automationId: input.automationId },
    _max: { order: true },
  });

  const condition: Condition | null =
    input.conditionField && input.conditionValue
      ? { field: input.conditionField, value: input.conditionValue }
      : null;

  return prisma.automationStep.create({
    data: {
      automationId: input.automationId,
      order: (maxOrder._max.order ?? -1) + 1,
      actionType: input.actionType,
      actionConfig: buildActionConfig(input),
      conditionJson: condition ?? undefined,
    },
  });
}

export async function removeStep(organizationId: string, stepId: string) {
  const step = await prisma.automationStep.findFirst({
    where: { id: stepId, automation: { organizationId } },
  });
  if (!step) throw new Error("Step does not belong to this organization.");
  await prisma.automationStep.delete({ where: { id: stepId } });
}
