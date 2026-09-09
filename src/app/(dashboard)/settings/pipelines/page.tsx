import { requirePermission } from "@/lib/rbac";
import { listPipelines } from "@/lib/modules/pipelines/service";
import { PIPELINE_TYPE_LABELS } from "@/lib/modules/pipelines/templates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreatePipelineForm } from "./create-pipeline-form";
import { StageManager } from "./stage-manager";
import { setDefaultPipelineAction } from "./actions";

export default async function PipelinesSettingsPage() {
  const session = await requirePermission("pipelines:manage");
  const pipelines = await listPipelines(session.user.organizationId);

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Pipelines</h1>

      <Card>
        <CardHeader>
          <CardTitle>New pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <CreatePipelineForm />
        </CardContent>
      </Card>

      {pipelines.map((pipeline) => (
        <Card key={pipeline.id}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{pipeline.name}</CardTitle>
              <p className="text-xs text-muted">{PIPELINE_TYPE_LABELS[pipeline.type]}</p>
            </div>
            {pipeline.isDefault ? (
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-foreground">Default</span>
            ) : (
              <form action={setDefaultPipelineAction}>
                <input type="hidden" name="pipelineId" value={pipeline.id} />
                <Button type="submit" variant="secondary" className="text-xs">
                  Make default
                </Button>
              </form>
            )}
          </CardHeader>
          <CardContent>
            <StageManager pipelineId={pipeline.id} stages={pipeline.stages} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
