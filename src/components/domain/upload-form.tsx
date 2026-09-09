"use client";

import { useActionState, useRef } from "react";
import { uploadDocumentAction, type UploadDocumentState } from "@/lib/modules/documents/actions";
import { DOCUMENT_CATEGORY_LABELS } from "@/lib/modules/documents/schema";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const initialState: UploadDocumentState = {};

export function UploadForm({ leadId, propertyId, dealId }: { leadId?: string; propertyId?: string; dealId?: string }) {
  const [state, formAction, pending] = useActionState(uploadDocumentAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      action={async (formData) => {
        await formAction(formData);
        formRef.current?.reset();
      }}
      ref={formRef}
      className="flex flex-wrap items-center gap-2"
    >
      {leadId && <input type="hidden" name="leadId" value={leadId} />}
      {propertyId && <input type="hidden" name="propertyId" value={propertyId} />}
      {dealId && <input type="hidden" name="dealId" value={dealId} />}
      {state.error && <Alert variant="error">{state.error}</Alert>}
      <input type="file" name="file" required className="text-sm" />
      <Select name="category" defaultValue="OTHER" className="h-8 w-44 text-xs">
        {Object.entries(DOCUMENT_CATEGORY_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>
      <Button type="submit" variant="secondary" className="text-xs" disabled={pending}>
        {pending ? "Uploading..." : "Upload"}
      </Button>
    </form>
  );
}
