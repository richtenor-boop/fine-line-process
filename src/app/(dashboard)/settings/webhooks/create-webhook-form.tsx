"use client";

import { useActionState } from "react";
import { createWebhookAction, type CreateWebhookState } from "@/lib/modules/webhooks/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

const initialState: CreateWebhookState = {};

export function CreateWebhookForm() {
  const [state, formAction, pending] = useActionState(createWebhookAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      {state.error && <Alert variant="error">{state.error}</Alert>}
      <Input name="url" type="url" placeholder="https://example.com/webhook" required className="w-72" />
      <Input name="event" placeholder="Event label (e.g. lead.stage_changed)" required className="w-64" />
      <Button type="submit" disabled={pending}>
        {pending ? "Adding..." : "Add webhook"}
      </Button>
    </form>
  );
}
