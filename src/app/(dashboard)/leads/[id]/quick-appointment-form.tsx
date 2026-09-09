"use client";

import { useActionState } from "react";
import { createAppointmentAction, type CreateAppointmentState } from "@/lib/modules/appointments/actions";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const initialState: CreateAppointmentState = {};

export function QuickAppointmentForm({ leadId }: { leadId: string }) {
  const [state, formAction, pending] = useActionState(createAppointmentAction, initialState);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="leadId" value={leadId} />
      {state.error && <Alert variant="error">{state.error}</Alert>}
      <Select name="type" className="h-8 text-sm" defaultValue="CONSULTATION">
        <option value="CONSULTATION">Consultation</option>
        <option value="PROPERTY_WALK">Property walk</option>
        <option value="CLOSING">Closing</option>
        <option value="COURT_DATE">Court date</option>
        <option value="AUCTION">Auction</option>
        <option value="OTHER">Other</option>
      </Select>
      <div className="grid grid-cols-2 gap-2">
        <Input name="startAt" type="datetime-local" required className="h-8 text-xs" />
        <Input name="endAt" type="datetime-local" required className="h-8 text-xs" />
      </div>
      <Input name="location" placeholder="Location (optional)" className="h-8 text-sm" />
      <Button type="submit" variant="secondary" className="w-full text-xs" disabled={pending}>
        Schedule
      </Button>
    </form>
  );
}
