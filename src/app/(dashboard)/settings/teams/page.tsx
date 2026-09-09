import { requirePermission } from "@/lib/rbac";
import { listTeams } from "@/lib/modules/teams/service";
import { listUsers } from "@/lib/modules/users/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateTeamForm } from "./create-team-form";
import { addTeamMemberAction, removeTeamMemberAction, deleteTeamAction } from "./actions";

export default async function TeamsSettingsPage() {
  const session = await requirePermission("teams:manage");
  const [teams, users] = await Promise.all([
    listTeams(session.user.organizationId),
    listUsers(session.user.organizationId),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Teams</h1>

      <Card>
        <CardHeader>
          <CardTitle>New team</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateTeamForm />
        </CardContent>
      </Card>

      {teams.map((team) => {
        const memberIds = new Set(team.members.map((m) => m.userId));
        const available = users.filter((u) => !memberIds.has(u.id));
        return (
          <Card key={team.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{team.name}</CardTitle>
              <form action={deleteTeamAction}>
                <input type="hidden" name="teamId" value={team.id} />
                <Button type="submit" variant="ghost" className="text-xs text-danger">
                  Delete team
                </Button>
              </form>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-1">
                {team.members.map((m) => (
                  <li key={m.userId} className="flex items-center justify-between text-sm">
                    <span>
                      {m.user.name} <span className="text-muted">({m.user.email})</span>
                    </span>
                    <form action={removeTeamMemberAction}>
                      <input type="hidden" name="teamId" value={team.id} />
                      <input type="hidden" name="userId" value={m.userId} />
                      <Button type="submit" variant="ghost" className="text-xs">
                        Remove
                      </Button>
                    </form>
                  </li>
                ))}
                {team.members.length === 0 && <p className="text-sm text-muted">No members yet.</p>}
              </ul>
              {available.length > 0 && (
                <form action={addTeamMemberAction} className="flex items-center gap-2">
                  <input type="hidden" name="teamId" value={team.id} />
                  <select name="userId" className="rounded-md border border-border bg-white px-2 py-1.5 text-sm">
                    {available.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" variant="secondary" className="text-xs">
                    Add member
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
