"use client";

import { useActionState } from "react";
import { updateOrganizationAction, type OrgSettingsState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
];

const initialState: OrgSettingsState = {};

export function OrganizationForm({ name, timezone }: { name: string; timezone: string }) {
  const [state, formAction, pending] = useActionState(updateOrganizationAction, initialState);

  return (
    <form action={formAction} className="max-w-md space-y-4">
      {state.error && <Alert variant="error">{state.error}</Alert>}
      {state.success && <Alert variant="success">Organization updated.</Alert>}
      <div>
        <Label htmlFor="name">Organization name</Label>
        <Input id="name" name="name" defaultValue={name} required />
      </div>
      <div>
        <Label htmlFor="timezone">Timezone</Label>
        <Select id="timezone" name="timezone" defaultValue={timezone}>
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}
