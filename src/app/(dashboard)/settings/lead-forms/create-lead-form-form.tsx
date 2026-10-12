"use client";

import { useActionState } from "react";
import { createLeadFormAction, type CreateLeadFormState } from "@/lib/modules/lead-forms/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

const initialState: CreateLeadFormState = {};

export function CreateLeadFormForm({ users }: { users: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createLeadFormAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="lf-name">Form name</Label>
          <Input id="lf-name" name="name" required placeholder="Website — We Buy Houses" />
        </div>
        <div>
          <Label htmlFor="lf-source">Lead source</Label>
          <Input id="lf-source" name="leadSourceName" required defaultValue="Website" />
        </div>
        <div>
          <Label htmlFor="lf-headline">Headline (optional)</Label>
          <Input id="lf-headline" name="headline" placeholder="Get a fair cash offer for your house" />
        </div>
        <div>
          <Label htmlFor="lf-assignee">Assign new leads to</Label>
          <Select id="lf-assignee" name="assignedUserId" defaultValue="">
            <option value="">Unassigned (notify me)</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="lf-thanks">Thank-you message (optional)</Label>
        <Textarea id="lf-thanks" name="thankYouMessage" rows={2} placeholder="Thanks! We'll call you within 24 hours." />
      </div>
      {state.error && <Alert variant="error">{state.error}</Alert>}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create form"}
      </Button>
    </form>
  );
}
