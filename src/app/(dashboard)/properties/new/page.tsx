import { requirePermission } from "@/lib/rbac";
import { PropertyForm } from "./property-form";

export default async function NewPropertyPage() {
  await requirePermission("properties:edit");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground">New property</h1>
      <PropertyForm />
    </div>
  );
}
