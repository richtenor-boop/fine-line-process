"use client";

import { useActionState } from "react";
import { createLeadAction, type CreateLeadState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { ContactPicker } from "@/components/domain/contact-picker";
import { PropertyPicker } from "@/components/domain/property-picker";

const initialState: CreateLeadState = {};

export function LeadForm({ users }: { users: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createLeadAction, initialState);

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      {state.error && <Alert variant="error">{state.error}</Alert>}

      <ContactPicker
        label="Seller contact"
        modeFieldName="contactMode"
        idFieldName="contactId"
        firstNameFieldName="firstName"
        lastNameFieldName="lastName"
        phoneFieldName="phone"
        emailFieldName="email"
      />

      <PropertyPicker />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="motivation">Motivation</Label>
          <Select id="motivation" name="motivation" defaultValue="UNKNOWN">
            <option value="UNKNOWN">Unknown</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="timeline">Timeline</Label>
          <Input id="timeline" name="timeline" placeholder="e.g. 30 days" />
        </div>
        <div>
          <Label htmlFor="askingPrice">Asking price ($)</Label>
          <Input id="askingPrice" name="askingPrice" type="number" min={0} />
        </div>
        <div>
          <Label htmlFor="leadSourceName">Lead source</Label>
          <Input id="leadSourceName" name="leadSourceName" placeholder="e.g. Direct mail" />
        </div>
        <div className="col-span-2">
          <Label htmlFor="assignedUserId">Assign to</Label>
          <Select id="assignedUserId" name="assignedUserId" defaultValue="">
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create lead"}
      </Button>
    </form>
  );
}
