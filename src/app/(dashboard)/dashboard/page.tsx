import { auth } from "@/lib/auth";
import { getOrganization, getOrganizationCounts } from "@/lib/modules/organizations/service";
import { countNewLeadsInLastDays } from "@/lib/modules/leads/service";
import { countOverdueTasks, countOpenTasksForUser } from "@/lib/modules/tasks/service";
import { countAppointmentsToday } from "@/lib/modules/appointments/service";
import { countDealsUnderContract, getActivePipelineValue } from "@/lib/modules/deals/service";
import { Card, CardContent } from "@/components/ui/card";

function KpiTile({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardContent>
        <p className="text-sm text-muted">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  const organizationId = session!.user.organizationId;

  const [organization, counts, newLeads, overdueTasks, myOpenTasks, appointmentsToday, dealsUnderContract, pipelineValue] =
    await Promise.all([
      getOrganization(organizationId),
      getOrganizationCounts(organizationId),
      countNewLeadsInLastDays(organizationId, 7),
      countOverdueTasks(organizationId),
      countOpenTasksForUser(organizationId, session!.user.id),
      countAppointmentsToday(organizationId),
      countDealsUnderContract(organizationId),
      getActivePipelineValue(organizationId),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{organization.name}</h1>
        <p className="text-sm text-muted">Welcome back, {session!.user.name}.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <KpiTile label="New leads (7d)" value={newLeads} />
        <KpiTile label="Properties" value={counts.properties} />
        <KpiTile label="My open tasks" value={myOpenTasks} />
        <KpiTile label="Overdue tasks (org)" value={overdueTasks} />
        <KpiTile label="Appointments today" value={appointmentsToday} />
        <KpiTile label="Team members" value={counts.users} />
        <KpiTile label="Deals under contract" value={dealsUnderContract} />
        <KpiTile label="Pipeline value" value={`$${pipelineValue.toLocaleString()}`} />
      </div>

      <Card>
        <CardContent>
          <p className="text-sm font-medium text-foreground">Full reporting</p>
          <p className="mt-1 text-sm text-muted">
            See <span className="font-mono text-xs">/reports</span> for lead-source, conversion,
            and financial breakdowns with date-range filtering.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
