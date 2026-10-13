"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createMediaLinkAction, type MediaLinkState } from "@/lib/modules/media-links/actions";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const initialState: MediaLinkState = {};

export function AddMediaLinkForm({ propertyId, leadId, hasLinks }: { propertyId?: string; leadId?: string; hasLinks: boolean }) {
  const [open, setOpen] = useState(!hasLinks);
  const [state, formAction, pending] = useActionState(createMediaLinkAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.savedAt) formRef.current?.reset();
  }, [state.savedAt]);

  if (!open) {
    return (
      <Button type="button" variant="secondary" className="rounded-full text-xs" onClick={() => setOpen(true)}>
        Add another
      </Button>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      {propertyId && <input type="hidden" name="propertyId" value={propertyId} />}
      {leadId && <input type="hidden" name="leadId" value={leadId} />}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_8rem]">
        <Input name="url" type="url" required placeholder="https://www.dropbox.com/..." aria-label="Link" />
        <Select name="kind" defaultValue="PHOTOS" aria-label="Link type">
          <option value="PHOTOS">Photos</option>
          <option value="VIDEO">Video</option>
          <option value="DOCUMENT">Document</option>
          <option value="OTHER">Other</option>
        </Select>
      </div>
      <Input name="label" placeholder="Label (optional), e.g. 80 Howard St NW photos" maxLength={160} aria-label="Label" />
      {state.error && <Alert variant="error">{state.error}</Alert>}
      <Button type="submit" disabled={pending} className="text-xs">
        {pending ? "Saving..." : "Save link"}
      </Button>
    </form>
  );
}
