"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { importLeadsBatchAction } from "@/lib/modules/imports/actions";
import { IMPORT_TARGET_FIELDS, type ImportRow, type DuplicateStrategy, type ImportRowResult } from "@/lib/modules/imports/schema";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";

type Step = "upload" | "map" | "preview" | "importing" | "results";
const BATCH_SIZE = 50;
const NONE = "__none__";

export function ImportWizard() {
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateStrategy>("skip");
  const [parseError, setParseError] = useState("");

  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ImportRowResult[]>([]);

  function onFileSelected(file: File) {
    setParseError("");
    setFileName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (parsed) => {
        if (parsed.errors.length > 0 && parsed.data.length === 0) {
          setParseError(parsed.errors[0]?.message ?? "Could not parse this file.");
          return;
        }
        setHeaders(parsed.meta.fields ?? []);
        setRawRows(parsed.data);
        setStep("map");
      },
      error: (err) => setParseError(err.message),
    });
  }

  const mappedRows: ImportRow[] = useMemo(() => {
    return rawRows.map((raw) => {
      const row: Record<string, string> = {};
      for (const field of IMPORT_TARGET_FIELDS) {
        const header = mapping[field.key];
        if (header && header !== NONE) row[field.key] = raw[header] ?? "";
      }
      return row as ImportRow;
    });
  }, [rawRows, mapping]);

  const hasNameMapping =
    (mapping.fullName && mapping.fullName !== NONE) ||
    ((mapping.firstName && mapping.firstName !== NONE) && (mapping.lastName && mapping.lastName !== NONE));

  async function runImport() {
    setStep("importing");
    setProgress(0);
    const allResults: ImportRowResult[] = [];

    for (let start = 0; start < mappedRows.length; start += BATCH_SIZE) {
      const batch = mappedRows.slice(start, start + BATCH_SIZE);
      const batchResults = await importLeadsBatchAction(batch, duplicateStrategy, start);
      allResults.push(...batchResults);
      setProgress(Math.min(start + BATCH_SIZE, mappedRows.length));
      setResults([...allResults]);
    }
    setStep("results");
  }

  if (step === "upload") {
    return (
      <Card>
        <CardContent className="space-y-3 pt-5">
          {parseError && <Alert variant="error">{parseError}</Alert>}
          <p className="text-sm text-muted">
            Upload a CSV of leads or properties (e.g. a foreclosure or tax-sale list). You&apos;ll map
            columns and preview before anything is saved.
          </p>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => e.target.files?.[0] && onFileSelected(e.target.files[0])}
            className="block text-sm"
          />
        </CardContent>
      </Card>
    );
  }

  if (step === "map") {
    return (
      <Card>
        <CardContent className="space-y-4 pt-5">
          <p className="text-sm text-muted">
            {fileName} — {rawRows.length} rows. Map each field to a column from your file, or leave
            it unmapped.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {IMPORT_TARGET_FIELDS.map((field) => (
              <div key={field.key}>
                <label className="mb-1 block text-xs font-medium text-foreground">{field.label}</label>
                <Select
                  value={mapping[field.key] ?? NONE}
                  onChange={(e) => setMapping((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  className="h-8 text-sm"
                >
                  <option value={NONE}>— Do not import —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </Select>
              </div>
            ))}
          </div>
          {!hasNameMapping && (
            <Alert variant="error">Map Full Name, or both First Name and Last Name, to continue.</Alert>
          )}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setStep("upload")}>
              Back
            </Button>
            <Button disabled={!hasNameMapping} onClick={() => setStep("preview")}>
              Preview
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "preview") {
    return (
      <Card>
        <CardContent className="space-y-4 pt-5">
          <p className="text-sm text-muted">Preview of the first 5 mapped rows out of {mappedRows.length}:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  {IMPORT_TARGET_FIELDS.filter((f) => mapping[f.key] && mapping[f.key] !== NONE).map((f) => (
                    <th key={f.key} className="px-2 py-1 font-medium">
                      {f.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mappedRows.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-b border-border">
                    {IMPORT_TARGET_FIELDS.filter((f) => mapping[f.key] && mapping[f.key] !== NONE).map((f) => (
                      <td key={f.key} className="px-2 py-1">
                        {row[f.key] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-foreground">
              If a matching email or phone already exists in an org contact:
            </p>
            <label className="mr-4 text-sm">
              <input
                type="radio"
                name="dup"
                checked={duplicateStrategy === "skip"}
                onChange={() => setDuplicateStrategy("skip")}
                className="mr-1"
              />
              Skip the row
            </label>
            <label className="text-sm">
              <input
                type="radio"
                name="dup"
                checked={duplicateStrategy === "create"}
                onChange={() => setDuplicateStrategy("create")}
                className="mr-1"
              />
              Import anyway (creates a new lead for the existing contact)
            </label>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setStep("map")}>
              Back
            </Button>
            <Button onClick={runImport}>Import {mappedRows.length} rows</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "importing") {
    return (
      <Card>
        <CardContent className="space-y-3 pt-5">
          <p className="text-sm text-foreground">
            Importing… {progress} / {mappedRows.length}
          </p>
          <div className="h-2 w-full rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-primary transition-all"
              style={{ width: `${(progress / mappedRows.length) * 100}%` }}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  // results
  const created = results.filter((r) => r.status === "created").length;
  const skipped = results.filter((r) => r.status === "skipped_duplicate").length;
  const errors = results.filter((r) => r.status === "error");

  return (
    <Card>
      <CardContent className="space-y-4 pt-5">
        <Alert variant={errors.length > 0 ? "error" : "success"}>
          {created} lead{created === 1 ? "" : "s"} created, {skipped} skipped as duplicates, {errors.length} error
          {errors.length === 1 ? "" : "s"}.
        </Alert>
        {errors.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-2 py-1 font-medium">Row</th>
                  <th className="px-2 py-1 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {errors.map((e) => (
                  <tr key={e.rowIndex} className="border-b border-border">
                    <td className="px-2 py-1">{e.rowIndex + 2}</td>
                    <td className="px-2 py-1 text-danger">{e.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Link href="/leads">
          <Button>Done — view leads</Button>
        </Link>
      </CardContent>
    </Card>
  );
}
