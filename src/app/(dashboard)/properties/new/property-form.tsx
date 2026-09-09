"use client";

import { useActionState } from "react";
import { createPropertyAction, type CreatePropertyState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { ContactPicker } from "@/components/domain/contact-picker";

const PROPERTY_TYPES = ["SINGLE_FAMILY", "MULTI_FAMILY", "CONDO", "TOWNHOME", "MOBILE_HOME", "LAND", "COMMERCIAL", "OTHER"];

const initialState: CreatePropertyState = {};

export function PropertyForm() {
  const [state, formAction, pending] = useActionState(createPropertyAction, initialState);

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      {state.error && <Alert variant="error">{state.error}</Alert>}

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label htmlFor="addressLine1">Address</Label>
          <Input id="addressLine1" name="addressLine1" required />
        </div>
        <div>
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" required />
        </div>
        <div>
          <Label htmlFor="county">County</Label>
          <Input id="county" name="county" />
        </div>
        <div>
          <Label htmlFor="state">State</Label>
          <Input id="state" name="state" maxLength={2} placeholder="GA" required />
        </div>
        <div>
          <Label htmlFor="zip">ZIP</Label>
          <Input id="zip" name="zip" required />
        </div>
        <div>
          <Label htmlFor="propertyType">Property type</Label>
          <Select id="propertyType" name="propertyType" defaultValue="SINGLE_FAMILY">
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="bedrooms">Bedrooms</Label>
          <Input id="bedrooms" name="bedrooms" type="number" min={0} />
        </div>
        <div>
          <Label htmlFor="bathrooms">Bathrooms</Label>
          <Input id="bathrooms" name="bathrooms" type="number" min={0} step="0.5" />
        </div>
        <div>
          <Label htmlFor="squareFeet">Square feet</Label>
          <Input id="squareFeet" name="squareFeet" type="number" min={0} />
        </div>
        <div>
          <Label htmlFor="yearBuilt">Year built</Label>
          <Input id="yearBuilt" name="yearBuilt" type="number" min={1600} max={2100} />
        </div>
        <div>
          <Label htmlFor="estimatedValue">Estimated value ($)</Label>
          <Input id="estimatedValue" name="estimatedValue" type="number" min={0} />
        </div>
        <div>
          <Label htmlFor="mortgageBalance">Mortgage balance ($)</Label>
          <Input id="mortgageBalance" name="mortgageBalance" type="number" min={0} />
        </div>
      </div>

      <ContactPicker
        label="Owner (optional)"
        modeFieldName="ownerContactMode"
        idFieldName="ownerContactId"
        firstNameFieldName="ownerFirstName"
        lastNameFieldName="ownerLastName"
        phoneFieldName="ownerPhone"
        emailFieldName="ownerEmail"
        required={false}
      />

      <Button type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create property"}
      </Button>
    </form>
  );
}
