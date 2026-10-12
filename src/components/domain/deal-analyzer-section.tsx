"use client";

import { useActionState, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { analyzeDeal, type DealInputs } from "@/lib/modules/deal-analyzer/calc";
import { saveDealAnalysisAction, type SaveDealAnalysisState } from "@/lib/modules/deal-analyzer/actions";

type FieldKey = keyof DealInputs;

const FIELDS: { key: FieldKey; label: string; suffix?: "%" | "mo"; group: "deal" | "costs" | "rental" }[] = [
  { key: "arv", label: "After-repair value (ARV)", group: "deal" },
  { key: "repairCost", label: "Repair cost", group: "deal" },
  { key: "purchasePrice", label: "Purchase price / offer", group: "deal" },
  { key: "maoPercent", label: "MAO rule", suffix: "%", group: "deal" },
  { key: "assignmentFee", label: "Assignment fee", group: "deal" },
  { key: "closingCostPercent", label: "Buy closing costs", suffix: "%", group: "costs" },
  { key: "sellingCostPercent", label: "Selling costs (agent + closing)", suffix: "%", group: "costs" },
  { key: "holdingMonths", label: "Holding period", suffix: "mo", group: "costs" },
  { key: "monthlyHoldingCost", label: "Monthly holding cost", group: "costs" },
  { key: "monthlyRent", label: "Monthly rent", group: "rental" },
  { key: "monthlyExpenses", label: "Monthly expenses (tax, ins., mgmt.)", group: "rental" },
];

const GROUP_TITLES = { deal: "Offer", costs: "Flip costs", rental: "Rental" } as const;

function toText(v: number | null): string {
  return v === null ? "" : String(v);
}

function money(n: number | null): string {
  if (n === null) return "—";
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function pct(n: number | null): string {
  return n === null ? "—" : `${n.toFixed(1)}%`;
}

const initialState: SaveDealAnalysisState = {};

export function DealAnalyzerSection({
  propertyId,
  initialInputs,
  saved,
  canEdit,
}: {
  propertyId: string;
  initialInputs: DealInputs;
  saved: boolean;
  canEdit: boolean;
}) {
  const [values, setValues] = useState<Record<FieldKey, string>>(
    () => Object.fromEntries(FIELDS.map((f) => [f.key, toText(initialInputs[f.key])])) as Record<FieldKey, string>,
  );
  const [state, formAction, pending] = useActionState(saveDealAnalysisAction, initialState);

  const results = useMemo(() => {
    const n = (k: FieldKey) => {
      const raw = values[k].trim();
      if (raw === "") return null;
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : null;
    };
    return analyzeDeal({
      arv: n("arv"),
      repairCost: n("repairCost"),
      purchasePrice: n("purchasePrice"),
      maoPercent: n("maoPercent") ?? 70,
      assignmentFee: n("assignmentFee"),
      closingCostPercent: n("closingCostPercent") ?? 2,
      sellingCostPercent: n("sellingCostPercent") ?? 8,
      holdingMonths: n("holdingMonths") ?? 6,
      monthlyHoldingCost: n("monthlyHoldingCost"),
      monthlyRent: n("monthlyRent"),
      monthlyExpenses: n("monthlyExpenses"),
    });
  }, [values]);

  const profitTone =
    results.flipProfit === null ? "text-foreground" : results.flipProfit >= 0 ? "text-green-700" : "text-red-700";

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle>Deal analyzer</CardTitle>
        {!saved && <span className="text-xs text-muted">Not saved yet — prefilled from this property&apos;s data</span>}
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-3 rounded-md bg-slate-50 p-4 sm:grid-cols-3">
          <Result label="Max allowable offer" value={money(results.mao)} emphasis />
          <Result label="Wholesale offer" value={money(results.wholesaleOffer)} emphasis />
          <Result
            label="Offer vs. MAO"
            value={results.spreadToMao === null ? "—" : `${money(results.spreadToMao)} ${results.spreadToMao >= 0 ? "under" : "over"}`}
            tone={results.spreadToMao === null ? undefined : results.spreadToMao >= 0 ? "text-green-700" : "text-red-700"}
          />
          <Result label="Flip profit" value={money(results.flipProfit)} tone={profitTone} />
          <Result label="Flip ROI" value={pct(results.flipRoiPercent)} />
          <Result label="Cash invested" value={money(results.totalInvestment)} />
          <Result label="Rental cash flow / mo" value={money(results.monthlyCashFlow)} />
          <Result label="Cap rate" value={pct(results.capRatePercent)} />
          <Result
            label="1% rule"
            value={results.meetsOnePercentRule === null ? "—" : results.meetsOnePercentRule ? "Passes" : "Fails"}
            tone={results.meetsOnePercentRule === null ? undefined : results.meetsOnePercentRule ? "text-green-700" : "text-red-700"}
          />
        </div>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="propertyId" value={propertyId} />
          {(["deal", "costs", "rental"] as const).map((group) => (
            <fieldset key={group} disabled={!canEdit} className="space-y-2">
              <legend className="text-xs font-semibold uppercase tracking-wide text-muted">{GROUP_TITLES[group]}</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {FIELDS.filter((f) => f.group === group).map((f) => (
                  <div key={f.key}>
                    <Label htmlFor={`da-${f.key}`}>
                      {f.label}
                      {f.suffix && <span className="ml-1 text-xs font-normal text-muted">({f.suffix})</span>}
                    </Label>
                    <Input
                      id={`da-${f.key}`}
                      name={f.key}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      value={values[f.key]}
                      onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            </fieldset>
          ))}

          <p className="text-xs text-muted">
            Figures assume an all-cash purchase. MAO = ARV × MAO% − repairs; wholesale offer = MAO − assignment fee.
          </p>

          {state.error && <Alert variant="error">{state.error}</Alert>}
          {state.savedAt && !state.error && <Alert variant="success">Analysis saved.</Alert>}
          {canEdit && (
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save analysis"}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

function Result({ label, value, tone, emphasis }: { label: string; value: string; tone?: string; emphasis?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className={`${emphasis ? "text-lg" : "text-base"} font-semibold ${tone ?? "text-foreground"}`}>{value}</p>
    </div>
  );
}
