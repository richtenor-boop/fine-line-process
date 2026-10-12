"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { generateContractAction, type GenerateContractState } from "@/lib/modules/contract-generator/actions";
import { CONTRACT_TYPE_LABELS, type ContractType } from "@/lib/modules/contract-generator/schema";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/cn";

export interface ContractFormDefaults {
  propertyId: string;
  leadId: string;
  sellerNames: string;
  buyerName: string;
  propertyAddress: string;
  parcelNumber: string;
  closingDate: string;
  purchasePrice?: number;
  lenderName: string;
  loanBalance?: number;
  monthlyPayment?: number;
  loanArrears?: number;
  repairBudget?: number;
  cashToSeller?: number;
}

const TYPE_HELP: Record<ContractType, string> = {
  CASH: "You buy the property for cash and close (or assign the contract to a cash buyer).",
  NOVATION: "You sell the property retail on the seller's behalf; the seller gets a guaranteed net and you keep the rest.",
  SUBJECT_TO: "You take title while the seller's existing mortgage stays in place, and you make the payments.",
};

const initialState: GenerateContractState = {};

export function ContractForm({ defaults, initialType }: { defaults: ContractFormDefaults; initialType: ContractType }) {
  const [type, setType] = useState<ContractType>(initialType);
  const [state, formAction, pending] = useActionState(generateContractAction, initialState);
  const v = (n?: number) => (n === undefined ? "" : String(n));

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="propertyId" value={defaults.propertyId} />
      <input type="hidden" name="leadId" value={defaults.leadId} />
      <input type="hidden" name="type" value={type} />

      <div role="radiogroup" aria-label="Contract type" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {(Object.keys(CONTRACT_TYPE_LABELS) as ContractType[]).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={type === t}
            onClick={() => setType(t)}
            className={cn(
              "rounded-lg border p-3 text-left transition-colors",
              type === t ? "border-accent bg-accent-soft ring-1 ring-accent" : "border-border bg-surface hover:border-primary/40",
            )}
          >
            <p className="text-sm font-semibold text-foreground">{CONTRACT_TYPE_LABELS[t]}</p>
            <p className="mt-1 text-xs text-muted">{TYPE_HELP[t]}</p>
          </button>
        ))}
      </div>

      <Section title="Parties & property">
        <Field name="sellerNames" label="Seller name(s)" defaultValue={defaults.sellerNames} required span />
        <Field name="buyerName" label="Buyer" defaultValue={defaults.buyerName} required span />
        <Field name="propertyAddress" label="Property address" defaultValue={defaults.propertyAddress} required span />
        <Field name="parcelNumber" label="Parcel number (optional)" defaultValue={defaults.parcelNumber} />
      </Section>

      <Section title="Price & closing">
        <Field
          name="purchasePrice"
          label={type === "NOVATION" ? "Seller's net amount ($)" : "Purchase price ($)"}
          type="number"
          defaultValue={v(defaults.purchasePrice)}
          required
        />
        <Field name="earnestMoney" label="Earnest money ($)" type="number" defaultValue="100" required />
        <Field name="closingAgent" label="Closing attorney / title company" required />
        <Field name="closingDate" label="Close on or before" type="date" defaultValue={defaults.closingDate} required />
        <Field name="inspectionDays" label="Inspection period (days)" type="number" defaultValue="10" required />
      </Section>

      {type === "NOVATION" && (
        <Section title="Novation terms">
          <Field name="marketingDays" label="Marketing period (days)" type="number" defaultValue="120" required />
          <Field name="repairBudget" label="Repair budget you'll fund ($)" type="number" defaultValue={v(defaults.repairBudget)} />
        </Section>
      )}

      {type === "SUBJECT_TO" && (
        <Section title="Existing loan">
          <Field name="lenderName" label="Lender / servicer" defaultValue={defaults.lenderName} required />
          <Field name="loanNumber" label="Loan number (optional)" />
          <Field name="loanBalance" label="Loan balance ($)" type="number" defaultValue={v(defaults.loanBalance)} required />
          <Field name="monthlyPayment" label="Monthly payment ($)" type="number" defaultValue={v(defaults.monthlyPayment)} required />
          <Field name="loanArrears" label="Missed payments to cure ($)" type="number" defaultValue={v(defaults.loanArrears)} />
          <Field name="cashToSeller" label="Cash to seller at closing ($)" type="number" defaultValue={v(defaults.cashToSeller)} />
        </Section>
      )}

      <div>
        <Label htmlFor="additionalTerms">Additional terms (optional)</Label>
        <Textarea id="additionalTerms" name="additionalTerms" rows={3} maxLength={4000} />
      </div>

      <Alert variant="error" className="border-amber-200 bg-amber-50 text-amber-800">
        These are template drafts, not legal advice. Have a real estate attorney in the property&apos;s state review every
        contract before anyone signs — especially novation and Subject-To agreements.
      </Alert>

      {state.error && <Alert variant="error">{state.error}</Alert>}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Generating..." : `Generate ${CONTRACT_TYPE_LABELS[type]}`}
        </Button>
        <Link href={`/properties/${defaults.propertyId}`} className="text-sm text-muted hover:underline">
          Cancel
        </Link>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</legend>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Field({
  name,
  label,
  span,
  ...props
}: { name: string; label: string; span?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={span ? "sm:col-span-2" : undefined}>
      <Label htmlFor={`cf-${name}`}>{label}</Label>
      <Input id={`cf-${name}`} name={name} min={props.type === "number" ? 0 : undefined} step="any" {...props} />
    </div>
  );
}
