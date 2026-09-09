"use client";

import { useActionState } from "react";
import { createMarketingCostAction, type CreateMarketingCostState } from "@/lib/modules/marketing-costs/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const initialState: CreateMarketingCostState = {};

export function MarketingCostForm() {
  const [state, formAction, pending] = useActionState(createMarketingCostAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      {state.error && <Alert variant="error">{state.error}</Alert>}
      <Input name="description" placeholder="e.g. Direct mail campaign" required className="h-8 w-56 text-sm" />
      <Input name="amount" type="number" min={0} placeholder="Amount ($)" required className="h-8 w-32 text-sm" />
      <Input name="incurredOn" type="date" required className="h-8 text-sm" />
      <Button type="submit" variant="secondary" className="text-xs" disabled={pending}>
        {pending ? "Adding..." : "Log spend"}
      </Button>
    </form>
  );
}
