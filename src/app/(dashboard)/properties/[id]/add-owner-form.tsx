"use client";

import { useState, useTransition } from "react";
import { searchContactsAction } from "@/lib/modules/contacts/actions";
import { addOwnerAction } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AddOwnerForm({ propertyId }: { propertyId: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; name: string; detail: string }[]>([]);
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const [, startTransition] = useTransition();

  function onQueryChange(value: string) {
    setQuery(value);
    setSelected(null);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    startTransition(async () => setResults(await searchContactsAction(value)));
  }

  return (
    <form action={addOwnerAction} className="space-y-1">
      <input type="hidden" name="propertyId" value={propertyId} />
      <input type="hidden" name="contactId" value={selected?.id ?? ""} />
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search contacts to add as owner..."
          value={selected ? selected.name : query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="h-8 w-64 text-xs"
        />
        <Button type="submit" variant="secondary" className="text-xs" disabled={!selected}>
          Add owner
        </Button>
      </div>
      {results.length > 0 && !selected && (
        <ul className="max-h-40 w-64 overflow-y-auto rounded-md border border-border bg-white text-sm shadow-sm">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => {
                  setSelected(r);
                  setResults([]);
                }}
                className="block w-full px-3 py-1.5 text-left text-xs hover:bg-slate-50"
              >
                {r.name} <span className="text-muted">{r.detail}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
