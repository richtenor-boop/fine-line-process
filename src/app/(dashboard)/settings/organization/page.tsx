import { requirePermission } from "@/lib/rbac";
import { getOrganization } from "@/lib/modules/organizations/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrganizationForm } from "./organization-form";

export default async function OrganizationSettingsPage() {
  const session = await requirePermission("organization:manage");
  const organization = await getOrganization(session.user.organizationId);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Organization</h1>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <OrganizationForm name={organization.name} timezone={organization.timezone} />
        </CardContent>
      </Card>
    </div>
  );
}
