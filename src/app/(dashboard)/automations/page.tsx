import Link from "next/link";
import { requirePermission } from "@/lib/rbac";
import { listAutomations } from "@/lib/modules/automations/service";
import { TRIGGER_LABELS } from "@/lib/modules/automations/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function AutomationsPage() {
  const session = await requirePermission("automations:manage");
  const automations = await listAutomations(session.user.organizationId);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Automations</h1>
        <Link href="/automations/new">
          <Button>New automation</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {automations.map((a) => (
              <li key={a.id}>
                <Link href={`/automations/${a.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                  <div>
                    <p className="font-medium text-foreground">{a.name}</p>
                    <p className="text-xs text-muted">
                      When {TRIGGER_LABELS[a.triggerType as keyof typeof TRIGGER_LABELS] ?? a.triggerType} · {a.steps.length}{" "}
                      step{a.steps.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span
                    className={
                      a.isActive
                        ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
                        : "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-muted"
                    }
                  >
                    {a.isActive ? "Active" : "Inactive"}
                  </span>
                </Link>
              </li>
            ))}
            {automations.length === 0 && (
              <li className="px-5 py-8 text-center text-sm text-muted">No automations yet.</li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
