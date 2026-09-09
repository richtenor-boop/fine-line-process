import { requirePermission } from "@/lib/rbac";
import { ImportWizard } from "./import-wizard";

export default async function ImportLeadsPage() {
  await requirePermission("leads:edit");

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Import leads from CSV</h1>
      <ImportWizard />
    </div>
  );
}
