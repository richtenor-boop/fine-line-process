"use client";

import { useActionState } from "react";
import { addTransactionAction, type AddTransactionState } from "@/lib/modules/deals/actions";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const initialState: AddTransactionState = {};

export function TransactionForm({ dealId }: { dealId: string }) {
  const [state, formAction, pending] = useActionState(addTransactionAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
      <input type="hidden" name="dealId" value={dealId} />
      {state.error && <Alert variant="error">{state.error}</Alert>}
      <Select name="type" className="h-8 text-xs" defaultValue="ACQUISITION_COST">
        <option value="ACQUISITION_COST">Acquisition cost</option>
        <option value="DISPOSITION_PROCEEDS">Disposition proceeds</option>
        <option value="ASSIGNMENT_FEE">Assignment fee</option>
        <option value="REPAIR_COST">Repair cost</option>
        <option value="CLOSING_COST">Closing cost</option>
        <option value="OTHER">Other</option>
      </Select>
      <Input name="amount" type="number" placeholder="Amount ($)" required className="h-8 w-32 text-xs" />
      <Input name="occurredOn" type="date" required className="h-8 text-xs" />
      <Button type="submit" variant="secondary" className="text-xs" disabled={pending}>
        Add
      </Button>
    </form>
  );
}
