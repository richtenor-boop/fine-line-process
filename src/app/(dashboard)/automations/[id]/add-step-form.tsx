"use client";

import { useActionState, useState } from "react";
import { addStepAction, type AddStepState } from "@/lib/modules/automations/actions";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { ACTION_LABELS, type ActionType } from "@/lib/modules/automations/schema";

const initialState: AddStepState = {};

interface StageOption {
  id: string;
  label: string;
}

export function AddStepForm({
  automationId,
  users,
  stages,
  campaigns,
  webhooks,
}: {
  automationId: string;
  users: { id: string; name: string }[];
  stages: StageOption[];
  campaigns: { id: string; name: string }[];
  webhooks: { id: string; event: string }[];
}) {
  const [state, formAction, pending] = useActionState(addStepAction, initialState);
  const [actionType, setActionType] = useState<ActionType>("SEND_SMS");
  const [hasCondition, setHasCondition] = useState(false);

  return (
    <form action={formAction} className="space-y-3 rounded-md border border-border p-4">
      <input type="hidden" name="automationId" value={automationId} />
      {state.error && <Alert variant="error">{state.error}</Alert>}

      <div>
        <Label htmlFor="actionType">Then...</Label>
        <Select
          id="actionType"
          name="actionType"
          value={actionType}
          onChange={(e) => setActionType(e.target.value as ActionType)}
        >
          {Object.entries(ACTION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      {actionType === "SEND_SMS" && (
        <div>
          <Label htmlFor="smsBody">Message</Label>
          <Textarea id="smsBody" name="smsBody" rows={2} required />
        </div>
      )}

      {actionType === "SEND_EMAIL" && (
        <>
          <div>
            <Label htmlFor="emailSubject">Subject</Label>
            <Input id="emailSubject" name="emailSubject" required />
          </div>
          <div>
            <Label htmlFor="emailBody">Body</Label>
            <Textarea id="emailBody" name="emailBody" rows={3} required />
          </div>
        </>
      )}

      {actionType === "CREATE_TASK" && (
        <>
          <div>
            <Label htmlFor="taskTitle">Task title</Label>
            <Input id="taskTitle" name="taskTitle" required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="taskDueInDays">Due in (days)</Label>
              <Input id="taskDueInDays" name="taskDueInDays" type="number" min={0} defaultValue={0} />
            </div>
            <div>
              <Label htmlFor="taskAssignedUserId">Assign to</Label>
              <Select id="taskAssignedUserId" name="taskAssignedUserId" defaultValue="">
                <option value="">Lead&apos;s assigned user</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </>
      )}

      {actionType === "ASSIGN_USER" && (
        <div>
          <Label htmlFor="assignUserId">Assign to</Label>
          <Select id="assignUserId" name="assignUserId" required>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      {actionType === "CHANGE_STAGE" && (
        <div>
          <Label htmlFor="changeStageId">New stage</Label>
          <Select id="changeStageId" name="changeStageId" required>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-muted">Only applied if the stage belongs to the lead&apos;s own pipeline.</p>
        </div>
      )}

      {(actionType === "ADD_TAG" || actionType === "REMOVE_TAG") && (
        <div>
          <Label htmlFor="tagName">Tag name</Label>
          <Input id="tagName" name="tagName" required />
        </div>
      )}

      {actionType === "CREATE_NOTIFICATION" && (
        <>
          <div>
            <Label htmlFor="notificationTitle">Title</Label>
            <Input id="notificationTitle" name="notificationTitle" required />
          </div>
          <div>
            <Label htmlFor="notificationBody">Body (optional)</Label>
            <Textarea id="notificationBody" name="notificationBody" rows={2} />
          </div>
          <div>
            <Label htmlFor="notificationUserId">Notify</Label>
            <Select id="notificationUserId" name="notificationUserId" defaultValue="">
              <option value="">Lead&apos;s assigned user</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </div>
        </>
      )}

      {actionType === "CREATE_APPOINTMENT" && (
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label htmlFor="appointmentType">Type</Label>
            <Select id="appointmentType" name="appointmentType" defaultValue="CONSULTATION">
              <option value="CONSULTATION">Consultation</option>
              <option value="PROPERTY_WALK">Property walk</option>
              <option value="CLOSING">Closing</option>
              <option value="COURT_DATE">Court date</option>
              <option value="AUCTION">Auction</option>
              <option value="OTHER">Other</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="appointmentDaysFromNow">Days from now</Label>
            <Input id="appointmentDaysFromNow" name="appointmentDaysFromNow" type="number" min={0} defaultValue={1} />
          </div>
          <div>
            <Label htmlFor="appointmentDurationMinutes">Duration (min)</Label>
            <Input id="appointmentDurationMinutes" name="appointmentDurationMinutes" type="number" min={5} defaultValue={30} />
          </div>
        </div>
      )}

      {(actionType === "START_CAMPAIGN" || actionType === "STOP_CAMPAIGN") && (
        <div>
          <Label htmlFor="campaignId">Campaign</Label>
          <Select id="campaignId" name="campaignId" required>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      {actionType === "SEND_WEBHOOK" && (
        <div>
          <Label htmlFor="webhookId">Webhook</Label>
          <Select id="webhookId" name="webhookId" required>
            {webhooks.map((w) => (
              <option key={w.id} value={w.id}>
                {w.event}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="border-t border-border pt-3">
        <label className="flex items-center gap-1.5 text-sm text-foreground">
          <input
            type="checkbox"
            checked={hasCondition}
            onChange={(e) => setHasCondition(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Only if...
        </label>
        {hasCondition && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Select name="conditionField" defaultValue="motivation">
              <option value="motivation">Motivation equals</option>
              <option value="stageId">Current stage is</option>
              <option value="assignedUserId">Assigned to</option>
              <option value="tag">Has tag</option>
              <option value="state">Property state is</option>
              <option value="minEquity">Equity is at least</option>
            </Select>
            <Input name="conditionValue" placeholder="Value" required />
          </div>
        )}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Adding..." : "Add step"}
      </Button>
    </form>
  );
}
