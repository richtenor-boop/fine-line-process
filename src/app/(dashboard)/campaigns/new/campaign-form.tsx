"use client";

import { useActionState } from "react";
import { createCampaignAction, type CreateCampaignState } from "@/lib/modules/campaigns/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

const initialState: CreateCampaignState = {};

export function CampaignForm() {
  const [state, formAction, pending] = useActionState(createCampaignAction, initialState);

  return (
    <form action={formAction} className="max-w-md space-y-4">
      {state.error && <Alert variant="error">{state.error}</Alert>}
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required />
      </div>
      <label className="flex items-center gap-1.5 text-sm text-foreground">
        <input type="checkbox" name="respectQuietHours" value="true" defaultChecked className="h-4 w-4 accent-primary" />
        Respect quiet hours (8am–9pm) for SMS
      </label>
      <label className="flex items-center gap-1.5 text-sm text-foreground">
        <input type="checkbox" name="respectBusinessHours" value="true" defaultChecked className="h-4 w-4 accent-primary" />
        Respect business hours (Mon–Fri 8am–6pm) for call/voicemail/mail tasks
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create campaign"}
      </Button>
    </form>
  );
}
