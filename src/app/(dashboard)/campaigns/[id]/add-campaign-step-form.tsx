"use client";

import { useActionState } from "react";
import { addCampaignStepAction, type AddCampaignStepState } from "@/lib/modules/campaigns/actions";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const initialState: AddCampaignStepState = {};

export function AddCampaignStepForm({ campaignId }: { campaignId: string }) {
  const [state, formAction, pending] = useActionState(addCampaignStepAction, initialState);

  return (
    <form action={formAction} className="space-y-3 rounded-md border border-border p-4">
      <input type="hidden" name="campaignId" value={campaignId} />
      {state.error && <Alert variant="error">{state.error}</Alert>}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="channel">Channel</Label>
          <Select id="channel" name="channel">
            <option value="SMS">SMS</option>
            <option value="EMAIL">Email</option>
            <option value="PHONE_TASK">Phone call (creates a task)</option>
            <option value="VOICEMAIL">Voicemail (creates a task)</option>
            <option value="DIRECT_MAIL_TASK">Direct mail (creates a task)</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="delayDays">Delay (days after previous step)</Label>
          <Input id="delayDays" name="delayDays" type="number" min={0} defaultValue={0} />
        </div>
      </div>
      <div>
        <Label htmlFor="subject">Subject (email only)</Label>
        <Input id="subject" name="subject" />
      </div>
      <div>
        <Label htmlFor="templateBody">Message / task notes</Label>
        <Textarea id="templateBody" name="templateBody" rows={3} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding..." : "Add step"}
      </Button>
    </form>
  );
}
