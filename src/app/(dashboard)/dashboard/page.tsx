import { auth } from "@/lib/auth";
import { getOrganization, getOrganizationCounts } from "@/lib/modules/organizations/service";
import { countNewLeadsInLastDays } from "@/lib/modules/leads/service";
import { countOverdueTasks, countOpenTasksForUser } from "@/lib/modules/tasks/service";
import { countAppointmentsToday } from "@/lib/modules/appointments/service";
import { countDealsUnderContract, getActivePipelineValue } from "@/lib/modules/deals/service";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";

function KpiTile({
  label,
  value,
  href,
  featured = false,
}: {
  label: string;
  value: number | string;
  href: string;
  featured?: boolean;
}) {
  return (
    <Link href={href} className="group block">
      <Card
        className={cn(
          "h-full border-t-2 transition-shadow group-hover:shadow-md",
          featured ? "border-t-accent bg-primary" : "border-t-accent/70",
        )}
      >
        <CardContent>
          <p className={cn("text-sm", featured ? "text-sidebar-foreground" : "text-muted")}>{label}</p>
          <p className={cn("mt-1 text-2xl font-semibold", featured ? "text-accent" : "text-foreground")}>{value}</p>
        </CardContent>
      </Card>
    </Link>
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
        <KpiTile label="New leads (7d)" value={newLeads} href="/leads" />
        <KpiTile label="Properties" value={counts.properties} href="/properties" />
        <KpiTile label="My open tasks" value={myOpenTasks} href="/tasks" />
        <KpiTile label="Overdue tasks (org)" value={overdueTasks} href="/tasks?view=overdue" />
        <KpiTile label="Appointments today" value={appointmentsToday} href="/calendar" />
        <KpiTile label="Team members" value={counts.users} href="/settings/users" />
        <KpiTile label="Deals under contract" value={dealsUnderContract} href="/deals" featured />
        <KpiTile label="Pipeline value" value={`$${pipelineValue.toLocaleString()}`} href="/deals" featured />
      </div>

      <Link href="/reports" className="block">
        <Card className="transition-shadow hover:shadow-md">
          <CardContent>
            <p className="text-sm font-medium text-foreground">Full reporting →</p>
            <p className="mt-1 text-sm text-muted">
              Lead source, speed to lead, conversion, and financial breakdowns with date-range filtering.
            </p>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
