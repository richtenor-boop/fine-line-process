"use client";

import { useActionState } from "react";
import { createAutomationAction, type CreateAutomationState } from "@/lib/modules/automations/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { TRIGGER_LABELS } from "@/lib/modules/automations/schema";

const initialState: CreateAutomationState = {};

export function AutomationForm() {
  const [state, formAction, pending] = useActionState(createAutomationAction, initialState);

  return (
    <form action={formAction} className="max-w-md space-y-4">
      {state.error && <Alert variant="error">{state.error}</Alert>}
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required />
      </div>
      <div>
        <Label htmlFor="triggerType">Trigger</Label>
        <Select id="triggerType" name="triggerType">
          {Object.entries(TRIGGER_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create automation"}
      </Button>
    </form>
  );
}
