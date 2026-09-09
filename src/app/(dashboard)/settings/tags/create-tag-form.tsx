"use client";

import { useActionState } from "react";
import { createTagAction, type CreateTagState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

const initialState: CreateTagState = {};

export function CreateTagForm() {
  const [state, formAction, pending] = useActionState(createTagAction, initialState);

  return (
    <form action={formAction} className="flex items-end gap-3">
      {state.error && <Alert variant="error">{state.error}</Alert>}
      <Input name="name" placeholder="Tag name" required className="w-56" />
      <Button type="submit" disabled={pending}>
        {pending ? "Adding..." : "Add tag"}
      </Button>
    </form>
  );
}
