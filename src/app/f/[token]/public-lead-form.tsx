"use client";

import { useActionState } from "react";
import { submitPublicLeadFormAction, type PublicSubmitState } from "./actions";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const initialState: PublicSubmitState = {};

export function PublicLeadForm({ publicToken }: { publicToken: string }) {
  const [state, formAction, pending] = useActionState(submitPublicLeadFormAction.bind(null, publicToken), initialState);

  if (state.done) {
    return (
      <Alert variant="success" className="text-base">
        {state.thankYouMessage || "Thank you! We received your information and will be in touch shortly."}
      </Alert>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {/* Honeypot — hidden from people and assistive tech, see actions.ts. */}
      <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <label htmlFor="company_website">Leave this empty</label>
        <input id="company_website" name="company_website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field id="firstName" label="First name" required autoComplete="given-name" />
        <Field id="lastName" label="Last name" required autoComplete="family-name" />
        <Field id="phone" label="Phone" type="tel" autoComplete="tel" />
        <Field id="email" label="Email" type="email" autoComplete="email" />
      </div>

      <p className="text-sm font-medium text-foreground">Property address</p>
      <Field id="addressLine1" label="Street address" autoComplete="street-address" />
      <div className="grid grid-cols-3 gap-3">
        <Field id="city" label="City" autoComplete="address-level2" />
        <Field id="state" label="State" maxLength={2} placeholder="TX" autoComplete="address-level1" />
        <Field id="zip" label="ZIP" inputMode="numeric" maxLength={10} autoComplete="postal-code" />
      </div>

      <Field id="timeline" label="How soon do you want to sell?" placeholder="e.g. ASAP, 1–3 months" />
      <div>
        <Label htmlFor="message">Anything else we should know?</Label>
        <Textarea id="message" name="message" rows={3} maxLength={2000} />
      </div>

      {state.error && <Alert variant="error">{state.error}</Alert>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Sending..." : "Get my offer"}
      </Button>
      <p className="text-xs text-muted">
        By submitting, you agree to be contacted about your property by phone, text, or email.
      </p>
    </form>
  );
}

function Field({ id, label, ...props }: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <Label htmlFor={id}>
        {label}
        {props.required && <span className="text-danger"> *</span>}
      </Label>
      <Input id={id} name={id} {...props} />
    </div>
  );
}
