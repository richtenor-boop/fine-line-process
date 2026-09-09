"use client";

import { useActionState } from "react";
import { createTaskAction, type CreateTaskState } from "@/lib/modules/tasks/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const initialState: CreateTaskState = {};

export function QuickTaskForm({ leadId, propertyId }: { leadId?: string; propertyId?: string }) {
  const [state, formAction, pending] = useActionState(createTaskAction, initialState);

  return (
    <form action={formAction} className="flex items-center gap-2">
      {leadId && <input type="hidden" name="leadId" value={leadId} />}
      {propertyId && <input type="hidden" name="propertyId" value={propertyId} />}
      {state.error && <Alert variant="error">{state.error}</Alert>}
      <Input name="title" placeholder="New task..." required className="h-8 flex-1 text-sm" />
      <Input name="dueAt" type="date" className="h-8 w-36 text-sm" />
      <Button type="submit" variant="secondary" className="text-xs" disabled={pending}>
        Add
      </Button>
    </form>
  );
}
