import { requirePermission } from "@/lib/rbac";
import { AutomationForm } from "./automation-form";

export default async function NewAutomationPage() {
  await requirePermission("automations:manage");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground">New automation</h1>
      <AutomationForm />
    </div>
  );
}
