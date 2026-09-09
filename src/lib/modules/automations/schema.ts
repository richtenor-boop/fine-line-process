import { z } from "zod";

/**
 * Only the triggers that fire off real, already-wired mutations are offered — source spec §11
 * also lists Form Submitted, Incoming/Missed Call, and Date Reached, which need infrastructure
 * that doesn't exist yet (public forms, call-answer detection, a scheduler). Contract Signed
 * joined once Phase 7 built Contracts. The Prisma enum still carries every trigger so wiring one
 * later is additive, not a migration.
 */
export const supportedTriggerTypeEnum = z.enum([
  "LEAD_CREATED",
  "LEAD_UPDATED",
  "STAGE_CHANGED",
  "TAG_ADDED",
  "SMS_RECEIVED",
  "EMAIL_RECEIVED",
  "APPOINTMENT_SCHEDULED",
  "TASK_COMPLETED",
  "CONTRACT_SIGNED",
]);
export type SupportedTriggerType = z.infer<typeof supportedTriggerTypeEnum>;

export const TRIGGER_LABELS: Record<SupportedTriggerType, string> = {
  LEAD_CREATED: "Lead Created",
  LEAD_UPDATED: "Lead Updated",
  STAGE_CHANGED: "Stage Changed",
  TAG_ADDED: "Tag Added",
  SMS_RECEIVED: "SMS Received",
  EMAIL_RECEIVED: "Email Received",
  APPOINTMENT_SCHEDULED: "Appointment Scheduled",
  TASK_COMPLETED: "Task Completed",
  CONTRACT_SIGNED: "Contract Signed",
};

export const actionTypeEnum = z.enum([
  "SEND_SMS",
  "SEND_EMAIL",
  "CREATE_TASK",
  "ASSIGN_USER",
  "CHANGE_STAGE",
  "ADD_TAG",
  "REMOVE_TAG",
  "CREATE_NOTIFICATION",
  "CREATE_APPOINTMENT",
  "START_CAMPAIGN",
  "STOP_CAMPAIGN",
  "SEND_WEBHOOK",
  "GENERATE_AI_SUMMARY",
]);
export type ActionType = z.infer<typeof actionTypeEnum>;

export const ACTION_LABELS: Record<ActionType, string> = {
  SEND_SMS: "Send SMS",
  SEND_EMAIL: "Send Email",
  CREATE_TASK: "Create Task",
  ASSIGN_USER: "Assign User",
  CHANGE_STAGE: "Change Stage",
  ADD_TAG: "Add Tag",
  REMOVE_TAG: "Remove Tag",
  CREATE_NOTIFICATION: "Create Notification",
  CREATE_APPOINTMENT: "Create Appointment",
  START_CAMPAIGN: "Start Campaign",
  STOP_CAMPAIGN: "Stop Campaign",
  SEND_WEBHOOK: "Send Webhook",
  GENERATE_AI_SUMMARY: "Generate AI Summary",
};

// One condition predicate per step — not a boolean expression tree. Covers source spec §11's
// condition list except "Lead Type" (no such field exists) and "Last Contact Date" (would need a
// denormalized last-contact timestamp not currently tracked).
export const conditionFieldEnum = z.enum(["motivation", "stageId", "assignedUserId", "tag", "state", "minEquity"]);
export type ConditionField = z.infer<typeof conditionFieldEnum>;

export const conditionSchema = z.object({
  field: conditionFieldEnum,
  value: z.string().min(1),
});
export type Condition = z.infer<typeof conditionSchema>;

export const createAutomationSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  triggerType: supportedTriggerTypeEnum,
});
export type CreateAutomationInput = z.infer<typeof createAutomationSchema>;

// Flat form shape for adding one step — actionConfig fields are all optional here and picked
// apart per actionType server-side; see src/lib/modules/automations/service.ts#buildActionConfig.
export const addStepSchema = z.object({
  automationId: z.string().min(1),
  actionType: actionTypeEnum,
  conditionField: z.union([conditionFieldEnum, z.literal("")]).optional(),
  conditionValue: z.string().optional(),
  // action-specific, all optional at the schema level
  smsBody: z.string().max(1600).optional(),
  emailSubject: z.string().max(200).optional(),
  emailBody: z.string().max(20000).optional(),
  taskTitle: z.string().max(200).optional(),
  taskDueInDays: z.coerce.number().int().min(0).optional(),
  taskAssignedUserId: z.string().optional(),
  assignUserId: z.string().optional(),
  changeStageId: z.string().optional(),
  tagName: z.string().max(60).optional(),
  notificationTitle: z.string().max(200).optional(),
  notificationBody: z.string().max(1000).optional(),
  notificationUserId: z.string().optional(),
  appointmentType: z.string().optional(),
  appointmentDaysFromNow: z.coerce.number().int().min(0).optional(),
  appointmentDurationMinutes: z.coerce.number().int().min(5).optional(),
  campaignId: z.string().optional(),
  webhookId: z.string().optional(),
});
export type AddStepInput = z.infer<typeof addStepSchema>;
