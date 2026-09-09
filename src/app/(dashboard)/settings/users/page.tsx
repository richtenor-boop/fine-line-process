import { requirePermission } from "@/lib/rbac";
import { listUsers } from "@/lib/modules/users/service";
import { listRolesWithPermissions } from "@/lib/modules/roles/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateUserForm } from "./create-user-form";
import { changeUserRoleAction, toggleUserStatusAction } from "./actions";

export default async function UsersSettingsPage() {
  const session = await requirePermission("users:manage");
  const [users, roles] = await Promise.all([
    listUsers(session.user.organizationId),
    listRolesWithPermissions(session.user.organizationId),
  ]);

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Users</h1>

      <Card>
        <CardHeader>
          <CardTitle>Add a user</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateUserForm roles={roles.map((r) => ({ id: r.id, name: r.name }))} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team ({users.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-2 font-medium">Name</th>
                <th className="px-5 py-2 font-medium">Email</th>
                <th className="px-5 py-2 font-medium">Role</th>
                <th className="px-5 py-2 font-medium">Status</th>
                <th className="px-5 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 font-medium text-foreground">{user.name}</td>
                  <td className="px-5 py-3 text-muted">{user.email}</td>
                  <td className="px-5 py-3">
                    <form action={changeUserRoleAction} className="flex items-center gap-2">
                      <input type="hidden" name="userId" value={user.id} />
                      <select
                        name="roleId"
                        defaultValue={user.roleId}
                        className="rounded-md border border-border bg-white px-2 py-1 text-sm"
                      >
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                      <Button type="submit" variant="ghost" className="text-xs">
                        Update
                      </Button>
                    </form>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={
                        user.status === "ACTIVE"
                          ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
                          : "rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600"
                      }
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <form action={toggleUserStatusAction}>
                      <input type="hidden" name="userId" value={user.id} />
                      <input
                        type="hidden"
                        name="nextStatus"
                        value={user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"}
                      />
                      <Button type="submit" variant="ghost" className="text-xs">
                        {user.status === "ACTIVE" ? "Suspend" : "Reactivate"}
                      </Button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
