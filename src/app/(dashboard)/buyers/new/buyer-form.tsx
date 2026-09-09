"use client";

import { useActionState } from "react";
import { createBuyerAction, type CreateBuyerState } from "@/lib/modules/buyers/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { ContactPicker } from "@/components/domain/contact-picker";

const PROPERTY_TYPES = ["SINGLE_FAMILY", "MULTI_FAMILY", "CONDO", "TOWNHOME", "MOBILE_HOME", "LAND", "COMMERCIAL", "OTHER"];

const initialState: CreateBuyerState = {};

export function BuyerForm() {
  const [state, formAction, pending] = useActionState(createBuyerAction, initialState);

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      {state.error && <Alert variant="error">{state.error}</Alert>}

      <ContactPicker
        label="Buyer contact"
        modeFieldName="contactMode"
        idFieldName="contactId"
        firstNameFieldName="firstName"
        lastNameFieldName="lastName"
        phoneFieldName="phone"
        emailFieldName="email"
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="companyName">Company</Label>
          <Input id="companyName" name="companyName" />
        </div>
        <div>
          <Label htmlFor="strategy">Preferred strategy</Label>
          <Select id="strategy" name="strategy" defaultValue="">
            <option value="">Unspecified</option>
            <option value="FLIP">Flip</option>
            <option value="RENTAL">Rental</option>
            <option value="WHOLESALE">Wholesale</option>
            <option value="BRRRR">BRRRR</option>
            <option value="OTHER">Other</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="markets">Markets (comma-separated cities/states)</Label>
          <Input id="markets" name="markets" placeholder="Atlanta, GA" />
        </div>
        <div>
          <Label htmlFor="zipCodes">ZIP codes (comma-separated)</Label>
          <Input id="zipCodes" name="zipCodes" placeholder="30030, 30083" />
        </div>
        <div>
          <Label htmlFor="minPrice">Min price ($)</Label>
          <Input id="minPrice" name="minPrice" type="number" min={0} />
        </div>
        <div>
          <Label htmlFor="maxPrice">Max price ($)</Label>
          <Input id="maxPrice" name="maxPrice" type="number" min={0} />
        </div>
        <div>
          <Label htmlFor="minBedrooms">Min bedrooms</Label>
          <Input id="minBedrooms" name="minBedrooms" type="number" min={0} />
        </div>
        <div>
          <Label htmlFor="maxRehabBudget">Max rehab budget ($)</Label>
          <Input id="maxRehabBudget" name="maxRehabBudget" type="number" min={0} />
        </div>
      </div>

      <div>
        <Label>Property types (any if none selected)</Label>
        <div className="flex flex-wrap gap-3">
          {PROPERTY_TYPES.map((t) => (
            <label key={t} className="flex items-center gap-1.5 text-sm text-foreground">
              <input type="checkbox" name="propertyTypes" value={t} className="h-4 w-4 accent-primary" />
              {t.replace(/_/g, " ")}
            </label>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-1.5 text-sm text-foreground">
        <input type="checkbox" name="isCashBuyer" value="true" className="h-4 w-4 accent-primary" />
        Cash buyer
      </label>

      <Button type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create buyer"}
      </Button>
    </form>
  );
}
