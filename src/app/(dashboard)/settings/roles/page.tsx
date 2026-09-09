import { requirePermission } from "@/lib/rbac";
import { listRolesWithPermissions, listAllPermissions } from "@/lib/modules/roles/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PermissionMatrix } from "./permission-matrix";

export default async function RolesSettingsPage() {
  const session = await requirePermission("roles:manage");
  const [roles, permissions] = await Promise.all([
    listRolesWithPermissions(session.user.organizationId),
    listAllPermissions(),
  ]);

  const roleRows = roles.map((r) => ({
    id: r.id,
    name: r.name,
    grantedKeys: new Set(r.rolePermissions.map((rp) => rp.permission.key)),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Roles &amp; permissions</h1>
        <p className="text-sm text-muted">
          Toggle what each role can do. The Owner role always has full access. See{" "}
          <span className="font-mono text-xs">docs/04-rbac-matrix.md</span> for the default matrix.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            {roles.length} roles · {roles.reduce((sum, r) => sum + r._count.users, 0)} users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PermissionMatrix
            roles={roleRows}
            permissions={permissions.map((p) => ({ key: p.key, description: p.description }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
