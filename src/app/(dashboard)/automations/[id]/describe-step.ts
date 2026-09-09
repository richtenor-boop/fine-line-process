import { ACTION_LABELS, type ActionType, type Condition } from "@/lib/modules/automations/schema";

export function describeAction(actionType: string, config: Record<string, unknown>): string {
  const label = ACTION_LABELS[actionType as ActionType] ?? actionType;
  switch (actionType) {
    case "SEND_SMS":
      return `${label}: "${String(config.body ?? "")}"`;
    case "SEND_EMAIL":
      return `${label}: "${String(config.subject ?? "")}"`;
    case "CREATE_TASK":
      return `${label}: "${String(config.title ?? "")}"`;
    case "ADD_TAG":
    case "REMOVE_TAG":
      return `${label}: "${String(config.tagName ?? "")}"`;
    case "CREATE_NOTIFICATION":
      return `${label}: "${String(config.title ?? "")}"`;
    case "CREATE_APPOINTMENT":
      return `${label} in ${String(config.daysFromNow ?? 0)} day(s)`;
    default:
      return label;
  }
}

export function describeCondition(condition: Condition | null): string | null {
  if (!condition) return null;
  const fieldLabel: Record<Condition["field"], string> = {
    motivation: "motivation equals",
    stageId: "stage is",
    assignedUserId: "assigned to",
    tag: "has tag",
    state: "property state is",
    minEquity: "equity at least",
  };
  return `only if ${fieldLabel[condition.field]} "${condition.value}"`;
}
