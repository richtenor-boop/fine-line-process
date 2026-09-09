"use client";

import { useActionState } from "react";
import { createTeamAction, type CreateTeamState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

const initialState: CreateTeamState = {};

export function CreateTeamForm() {
  const [state, formAction, pending] = useActionState(createTeamAction, initialState);

  return (
    <form action={formAction} className="flex items-end gap-3">
      {state.error && <Alert variant="error">{state.error}</Alert>}
      <div>
        <Input name="name" placeholder="Team name" required className="w-64" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create team"}
      </Button>
    </form>
  );
}
