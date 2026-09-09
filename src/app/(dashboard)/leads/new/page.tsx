import { requirePermission } from "@/lib/rbac";
import { listUsers } from "@/lib/modules/users/service";
import { LeadForm } from "./lead-form";

export default async function NewLeadPage() {
  const session = await requirePermission("leads:edit");
  const users = await listUsers(session.user.organizationId);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground">New lead</h1>
      <LeadForm users={users.map((u) => ({ id: u.id, name: u.name }))} />
    </div>
  );
}
