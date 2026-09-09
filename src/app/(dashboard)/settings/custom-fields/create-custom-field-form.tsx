"use client";

import { useActionState, useState } from "react";
import { createCustomFieldAction, type CreateCustomFieldState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

const initialState: CreateCustomFieldState = {};

export function CreateCustomFieldForm() {
  const [state, formAction, pending] = useActionState(createCustomFieldAction, initialState);
  const [fieldType, setFieldType] = useState("TEXT");

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      {state.error && <Alert variant="error">{state.error}</Alert>}
      <div>
        <Label htmlFor="entity">Applies to</Label>
        <Select id="entity" name="entity" className="w-32">
          <option value="LEAD">Lead</option>
          <option value="PROPERTY">Property</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="label">Label</Label>
        <Input id="label" name="label" required className="w-48" />
      </div>
      <div>
        <Label htmlFor="fieldType">Type</Label>
        <Select
          id="fieldType"
          name="fieldType"
          className="w-32"
          value={fieldType}
          onChange={(e) => setFieldType(e.target.value)}
        >
          <option value="TEXT">Text</option>
          <option value="NUMBER">Number</option>
          <option value="DATE">Date</option>
          <option value="BOOLEAN">Yes/No</option>
          <option value="SELECT">Select</option>
        </Select>
      </div>
      {fieldType === "SELECT" && (
        <div>
          <Label htmlFor="options">Options (comma-separated)</Label>
          <Input id="options" name="options" placeholder="Option A, Option B" className="w-56" />
        </div>
      )}
      <label className="mb-2 flex items-center gap-1.5 text-sm text-foreground">
        <input type="checkbox" name="isRequired" value="true" className="h-4 w-4 accent-primary" />
        Required
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding..." : "Add field"}
      </Button>
    </form>
  );
}
