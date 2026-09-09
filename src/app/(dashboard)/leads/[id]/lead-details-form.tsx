"use client";

import { useActionState } from "react";
import { updateLeadDetailsAction, type UpdateLeadDetailsState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

const initialState: UpdateLeadDetailsState = {};

export function LeadDetailsForm({
  leadId,
  motivation,
  timeline,
  askingPrice,
  offerAmount,
  nextFollowUpAt,
}: {
  leadId: string;
  motivation: string;
  timeline: string;
  askingPrice: string;
  offerAmount: string;
  nextFollowUpAt: string;
}) {
  const [state, formAction, pending] = useActionState(updateLeadDetailsAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="leadId" value={leadId} />
      {state.error && <Alert variant="error">{state.error}</Alert>}
      {state.success && <Alert variant="success">Saved.</Alert>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="motivation">Motivation</Label>
          <Select id="motivation" name="motivation" defaultValue={motivation}>
            <option value="UNKNOWN">Unknown</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="timeline">Timeline</Label>
          <Input id="timeline" name="timeline" defaultValue={timeline} />
        </div>
        <div>
          <Label htmlFor="askingPrice">Asking price ($)</Label>
          <Input id="askingPrice" name="askingPrice" type="number" min={0} defaultValue={askingPrice} />
        </div>
        <div>
          <Label htmlFor="offerAmount">Offer amount ($)</Label>
          <Input id="offerAmount" name="offerAmount" type="number" min={0} defaultValue={offerAmount} />
        </div>
        <div className="col-span-2">
          <Label htmlFor="nextFollowUpAt">Next follow-up</Label>
          <Input id="nextFollowUpAt" name="nextFollowUpAt" type="date" defaultValue={nextFollowUpAt} />
        </div>
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}
