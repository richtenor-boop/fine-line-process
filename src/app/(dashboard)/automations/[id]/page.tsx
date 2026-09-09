import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { getAutomation } from "@/lib/modules/automations/service";
import { toggleAutomationAction, deleteAutomationAction, removeStepAction } from "@/lib/modules/automations/actions";
import { listUsers } from "@/lib/modules/users/service";
import { listPipelines } from "@/lib/modules/pipelines/service";
import { listCampaigns } from "@/lib/modules/campaigns/service";
import { listWebhooks } from "@/lib/modules/webhooks/service";
import { TRIGGER_LABELS } from "@/lib/modules/automations/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddStepForm } from "./add-step-form";
import { describeAction, describeCondition } from "./describe-step";
import type { Condition } from "@/lib/modules/automations/schema";

export default async function AutomationDetailPage({ params }: PageProps<"/automations/[id]">) {
  const { id } = await params;
  const session = await requirePermission("automations:manage");

  const [automation, users, pipelines, campaigns, webhooks] = await Promise.all([
    getAutomation(session.user.organizationId, id),
    listUsers(session.user.organizationId),
    listPipelines(session.user.organizationId),
    listCampaigns(session.user.organizationId),
    listWebhooks(session.user.organizationId),
  ]);
  if (!automation) notFound();

  const stageOptions = pipelines.flatMap((p) => p.stages.map((s) => ({ id: s.id, label: `${p.name} → ${s.name}` })));

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{automation.name}</h1>
          <p className="text-sm text-muted">
            When {TRIGGER_LABELS[automation.triggerType as keyof typeof TRIGGER_LABELS] ?? automation.triggerType}
          </p>
        </div>
        <div className="flex gap-2">
          <form action={toggleAutomationAction}>
            <input type="hidden" name="automationId" value={automation.id} />
            <input type="hidden" name="isActive" value={(!automation.isActive).toString()} />
            <Button type="submit" variant={automation.isActive ? "secondary" : "primary"}>
              {automation.isActive ? "Deactivate" : "Activate"}
            </Button>
          </form>
          <form action={deleteAutomationAction}>
            <input type="hidden" name="automationId" value={automation.id} />
            <Button type="submit" variant="ghost" className="text-danger">
              Delete
            </Button>
          </form>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ol className="space-y-2">
            {automation.steps.map((step, i) => {
              const condition = describeCondition((step.conditionJson as Condition | null) ?? null);
              return (
                <li key={step.id} className="flex items-start justify-between gap-2 rounded-md border border-border p-3 text-sm">
                  <div>
                    <p className="text-foreground">
                      {i + 1}. {describeAction(step.actionType, step.actionConfig as Record<string, unknown>)}
                    </p>
                    {condition && <p className="text-xs text-muted">{condition}</p>}
                  </div>
                  <form action={removeStepAction}>
                    <input type="hidden" name="stepId" value={step.id} />
                    <input type="hidden" name="automationId" value={automation.id} />
                    <Button type="submit" variant="ghost" className="text-xs">
                      Remove
                    </Button>
                  </form>
                </li>
              );
            })}
            {automation.steps.length === 0 && <p className="text-sm text-muted">No steps yet — add one below.</p>}
          </ol>

          <AddStepForm
            automationId={automation.id}
            users={users.map((u) => ({ id: u.id, name: u.name }))}
            stages={stageOptions}
            campaigns={campaigns.map((c) => ({ id: c.id, name: c.name }))}
            webhooks={webhooks.map((w) => ({ id: w.id, event: w.event }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
