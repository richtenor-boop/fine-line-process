"use client";

import { useActionState } from "react";
import { createOfferAction, type CreateOfferState } from "@/lib/modules/deals/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const initialState: CreateOfferState = {};

export function OfferForm({ leadId }: { leadId: string }) {
  const [state, formAction, pending] = useActionState(createOfferAction, initialState);

  return (
    <form action={formAction} className="flex items-center gap-2 border-t border-border pt-3">
      <input type="hidden" name="leadId" value={leadId} />
      {state.error && <Alert variant="error">{state.error}</Alert>}
      <Input name="amount" type="number" min={0} placeholder="Offer amount ($)" required className="h-8 w-40 text-sm" />
      <Button type="submit" variant="secondary" className="text-xs" disabled={pending}>
        {pending ? "Adding..." : "New offer"}
      </Button>
    </form>
  );
}
