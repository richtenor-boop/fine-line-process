"use client";

import { useActionState } from "react";
import { setDealSalePriceAction, type SetSalePriceState } from "@/lib/modules/deals/actions";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const initialState: SetSalePriceState = {};

export function SalePriceForm({ dealId, salePrice, assignmentFee }: { dealId: string; salePrice: string; assignmentFee: string }) {
  const [state, formAction, pending] = useActionState(setDealSalePriceAction, initialState);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="dealId" value={dealId} />
      {state.error && <Alert variant="error">{state.error}</Alert>}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="salePrice">Sale price ($)</Label>
          <Input id="salePrice" name="salePrice" type="number" min={0} defaultValue={salePrice} />
        </div>
        <div>
          <Label htmlFor="assignmentFee">Assignment fee ($)</Label>
          <Input id="assignmentFee" name="assignmentFee" type="number" min={0} defaultValue={assignmentFee} />
        </div>
      </div>
      <Button type="submit" variant="secondary" className="text-xs" disabled={pending}>
        Save
      </Button>
    </form>
  );
}
