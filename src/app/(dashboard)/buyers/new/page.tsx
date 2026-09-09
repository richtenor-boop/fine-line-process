import { requirePermission } from "@/lib/rbac";
import { BuyerForm } from "./buyer-form";

export default async function NewBuyerPage() {
  await requirePermission("buyers:edit");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground">New buyer</h1>
      <BuyerForm />
    </div>
  );
}
