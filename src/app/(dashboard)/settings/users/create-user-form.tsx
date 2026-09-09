"use client";

import { useActionState } from "react";
import { createUserAction, type CreateUserState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

const initialState: CreateUserState = {};

export function CreateUserForm({ roles }: { roles: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createUserAction, initialState);

  return (
    <div className="space-y-3">
      {state.error && <Alert variant="error">{state.error}</Alert>}
      {state.temporaryPassword && (
        <Alert variant="success">
          Created {state.createdEmail}. Temporary password (shown once — relay it to the user):{" "}
          <span className="font-mono font-semibold">{state.temporaryPassword}</span>
        </Alert>
      )}
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required className="w-48" />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required className="w-64" />
        </div>
        <div>
          <Label htmlFor="roleId">Role</Label>
          <Select id="roleId" name="roleId" required className="w-48">
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating..." : "Add user"}
        </Button>
      </form>
    </div>
  );
}
