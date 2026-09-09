import { requirePermission } from "@/lib/rbac";
import { CampaignForm } from "./campaign-form";

export default async function NewCampaignPage() {
  await requirePermission("campaigns:manage");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground">New campaign</h1>
      <CampaignForm />
    </div>
  );
}
