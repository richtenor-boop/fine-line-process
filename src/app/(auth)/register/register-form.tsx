"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction, type RegisterActionState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";

const initialState: RegisterActionState = {};

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, initialState);

  return (
    <Card>
      <CardContent className="space-y-4 pt-5">
        <h1 className="text-lg font-semibold text-foreground">Create your organization</h1>
        {state.error && <Alert variant="error">{state.error}</Alert>}
        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="organizationName">Organization name</Label>
            <Input id="organizationName" name="organizationName" required />
            {state.fieldErrors?.organizationName && (
              <p className="mt-1 text-xs text-danger">{state.fieldErrors.organizationName}</p>
            )}
          </div>
          <div>
            <Label htmlFor="ownerName">Your name</Label>
            <Input id="ownerName" name="ownerName" required />
            {state.fieldErrors?.ownerName && <p className="mt-1 text-xs text-danger">{state.fieldErrors.ownerName}</p>}
          </div>
          <div>
            <Label htmlFor="ownerEmail">Email</Label>
            <Input id="ownerEmail" name="ownerEmail" type="email" autoComplete="email" required />
            {state.fieldErrors?.ownerEmail && (
              <p className="mt-1 text-xs text-danger">{state.fieldErrors.ownerEmail}</p>
            )}
          </div>
          <div>
            <Label htmlFor="ownerPassword">Password</Label>
            <Input
              id="ownerPassword"
              name="ownerPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
            />
            {state.fieldErrors?.ownerPassword && (
              <p className="mt-1 text-xs text-danger">{state.fieldErrors.ownerPassword}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating..." : "Create organization"}
          </Button>
        </form>
        <p className="text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
