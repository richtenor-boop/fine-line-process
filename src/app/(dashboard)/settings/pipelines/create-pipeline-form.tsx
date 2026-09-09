"use client";

import { useActionState } from "react";
import { createPipelineAction, type CreatePipelineState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { PIPELINE_TYPE_LABELS } from "@/lib/modules/pipelines/templates";

const initialState: CreatePipelineState = {};

export function CreatePipelineForm() {
  const [state, formAction, pending] = useActionState(createPipelineAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      {state.error && <Alert variant="error">{state.error}</Alert>}
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required className="w-56" />
      </div>
      <div>
        <Label htmlFor="type">Type</Label>
        <Select id="type" name="type" className="w-48" defaultValue="GENERAL">
          {Object.entries(PIPELINE_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      <label className="mb-2 flex items-center gap-1.5 text-sm text-foreground">
        <input type="checkbox" name="useTemplate" value="true" defaultChecked className="h-4 w-4 accent-primary" />
        Start from template stages
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create pipeline"}
      </Button>
    </form>
  );
}
