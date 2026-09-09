"use client";

import { useState, useTransition } from "react";
import { searchPropertiesAction } from "@/lib/modules/properties/actions";
import { Input, Label } from "@/components/ui/input";

interface PropertyResult {
  id: string;
  name: string;
  detail: string;
}

/** Same "existing vs. new" pattern as ContactPicker, plus a "none" mode since a lead's property
 * is optional. Field names match src/lib/modules/leads/schema.ts's flat form shape. */
export function PropertyPicker() {
  const [mode, setMode] = useState<"none" | "existing" | "new">("none");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PropertyResult[]>([]);
  const [selected, setSelected] = useState<PropertyResult | null>(null);
  const [, startTransition] = useTransition();

  function onQueryChange(value: string) {
    setQuery(value);
    setSelected(null);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    startTransition(async () => setResults(await searchPropertiesAction(value)));
  }

  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Property (optional)</p>
        <div className="flex gap-2 text-xs">
          {(["none", "new", "existing"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={mode === m ? "font-semibold text-primary" : "text-muted"}
            >
              {m === "none" ? "None" : m === "new" ? "New" : "Existing"}
            </button>
          ))}
        </div>
      </div>

      <input type="hidden" name="propertyMode" value={mode} />

      {mode === "existing" && (
        <div className="space-y-1">
          <input type="hidden" name="propertyId" value={selected?.id ?? ""} />
          <Input
            placeholder="Search by address..."
            value={selected ? selected.name : query}
            onChange={(e) => onQueryChange(e.target.value)}
          />
          {results.length > 0 && !selected && (
            <ul className="max-h-40 overflow-y-auto rounded-md border border-border bg-white text-sm shadow-sm">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(r);
                      setResults([]);
                    }}
                    className="block w-full px-3 py-1.5 text-left hover:bg-slate-50"
                  >
                    {r.name} <span className="text-muted">{r.detail}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {mode === "new" && (
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2">
            <Label htmlFor="addressLine1">Address</Label>
            <Input id="addressLine1" name="addressLine1" required={mode === "new"} />
          </div>
          <div>
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" required={mode === "new"} />
          </div>
          <div>
            <Label htmlFor="state">State</Label>
            <Input id="state" name="state" maxLength={2} placeholder="GA" required={mode === "new"} />
          </div>
          <div>
            <Label htmlFor="zip">ZIP</Label>
            <Input id="zip" name="zip" required={mode === "new"} />
          </div>
        </div>
      )}
    </div>
  );
}
