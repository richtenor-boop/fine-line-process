"use client";

import { useState, useTransition } from "react";
import { searchContactsAction } from "@/lib/modules/contacts/actions";
import { Input, Label } from "@/components/ui/input";

interface ContactResult {
  id: string;
  name: string;
  detail: string;
}

/**
 * Toggles between "search an existing contact" and "create a new one inline". Renders hidden
 * inputs so the parent <form> submits either `<fieldPrefix>Mode=existing` + `<fieldPrefix>Id`, or
 * `<fieldPrefix>Mode=new` + first/last/phone/email — matching src/lib/modules/leads/schema.ts and
 * src/lib/modules/properties/schema.ts's flat form shape.
 */
export function ContactPicker({
  modeFieldName,
  idFieldName,
  firstNameFieldName,
  lastNameFieldName,
  phoneFieldName,
  emailFieldName,
  label = "Contact",
  required = true,
}: {
  modeFieldName: string;
  idFieldName: string;
  firstNameFieldName: string;
  lastNameFieldName: string;
  phoneFieldName: string;
  emailFieldName: string;
  label?: string;
  /** Whether first/last name are required when "New" is selected — false for an optional
   * relationship like a property's owner, true for a lead's contact. */
  required?: boolean;
}) {
  const [mode, setMode] = useState<"existing" | "new">("new");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ContactResult[]>([]);
  const [selected, setSelected] = useState<ContactResult | null>(null);
  const [, startTransition] = useTransition();

  function onQueryChange(value: string) {
    setQuery(value);
    setSelected(null);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    startTransition(async () => {
      const found = await searchContactsAction(value);
      setResults(found);
    });
  }

  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <div className="flex gap-1 text-xs">
          <button
            type="button"
            onClick={() => setMode("new")}
            className={mode === "new" ? "font-semibold text-primary" : "text-muted"}
          >
            New
          </button>
          <span className="text-muted">/</span>
          <button
            type="button"
            onClick={() => setMode("existing")}
            className={mode === "existing" ? "font-semibold text-primary" : "text-muted"}
          >
            Existing
          </button>
        </div>
      </div>

      <input type="hidden" name={modeFieldName} value={mode} />

      {mode === "existing" ? (
        <div className="space-y-1">
          <input type="hidden" name={idFieldName} value={selected?.id ?? ""} />
          <Input
            placeholder="Search by name, email, or phone..."
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
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor={firstNameFieldName}>First name</Label>
            <Input id={firstNameFieldName} name={firstNameFieldName} required={required && mode === "new"} />
          </div>
          <div>
            <Label htmlFor={lastNameFieldName}>Last name</Label>
            <Input id={lastNameFieldName} name={lastNameFieldName} required={required && mode === "new"} />
          </div>
          <div>
            <Label htmlFor={phoneFieldName}>Phone</Label>
            <Input id={phoneFieldName} name={phoneFieldName} type="tel" />
          </div>
          <div>
            <Label htmlFor={emailFieldName}>Email</Label>
            <Input id={emailFieldName} name={emailFieldName} type="email" />
          </div>
        </div>
      )}
    </div>
  );
}
