import { setCustomFieldValueAction } from "@/lib/modules/custom-fields/actions";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface DefinitionRow {
  id: string;
  label: string;
  fieldType: "TEXT" | "NUMBER" | "DATE" | "BOOLEAN" | "SELECT";
  options: unknown;
}

export function CustomFieldsSection({
  entityType,
  entityId,
  definitions,
  values,
}: {
  entityType: "LEAD" | "PROPERTY";
  entityId: string;
  definitions: DefinitionRow[];
  values: Record<string, string>;
}) {
  if (definitions.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Custom fields</p>
      <div className="space-y-2">
        {definitions.map((def) => (
          <form key={def.id} action={setCustomFieldValueAction} className="flex items-center gap-2">
            <input type="hidden" name="definitionId" value={def.id} />
            <input type="hidden" name="entityId" value={entityId} />
            <input type="hidden" name="entityType" value={entityType} />
            <label className="w-32 shrink-0 text-xs text-muted">{def.label}</label>
            {def.fieldType === "SELECT" ? (
              <Select name="value" defaultValue={values[def.id] ?? ""} className="h-8 text-xs">
                <option value="" disabled>
                  Select...
                </option>
                {(Array.isArray(def.options) ? (def.options as string[]) : []).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </Select>
            ) : def.fieldType === "BOOLEAN" ? (
              <Select name="value" defaultValue={values[def.id] ?? "false"} className="h-8 text-xs">
                <option value="true">Yes</option>
                <option value="false">No</option>
              </Select>
            ) : (
              <Input
                name="value"
                type={def.fieldType === "NUMBER" ? "number" : def.fieldType === "DATE" ? "date" : "text"}
                defaultValue={values[def.id] ?? ""}
                className="h-8 text-xs"
              />
            )}
            <Button type="submit" variant="ghost" className="text-xs">
              Save
            </Button>
          </form>
        ))}
      </div>
    </div>
  );
}
