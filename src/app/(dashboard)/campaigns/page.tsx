import Link from "next/link";
import { requirePermission } from "@/lib/rbac";
import { listCampaigns } from "@/lib/modules/campaigns/service";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProcessNowButton } from "./process-now-button";

export default async function CampaignsPage() {
  const session = await requirePermission("campaigns:manage");
  const campaigns = await listCampaigns(session.user.organizationId);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Campaigns</h1>
        <Link href="/campaigns/new">
          <Button>New campaign</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="space-y-2 pt-5">
          <p className="text-sm text-foreground">Step progression</p>
          <p className="text-xs text-muted">
            Runs automatically once an external scheduler is configured to call{" "}
            <span className="font-mono">POST /api/cron/campaign-tick</span> (see
            docs/06-integrations.md — this environment has no cron infrastructure of its own).
            Until then, use this to process due steps on demand.
          </p>
          <ProcessNowButton />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {campaigns.map((c) => (
              <li key={c.id}>
                <Link href={`/campaigns/${c.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                  <div>
                    <p className="font-medium text-foreground">{c.name}</p>
                    <p className="text-xs text-muted">
                      {c.steps.length} step{c.steps.length === 1 ? "" : "s"} · {c._count.enrollments} enrolled
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-foreground">
                    {c.status}
                  </span>
                </Link>
              </li>
            ))}
            {campaigns.length === 0 && (
              <li className="px-5 py-8 text-center text-sm text-muted">No campaigns yet.</li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
