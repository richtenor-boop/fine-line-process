import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { getPipelineForBoard, listPipelines } from "@/lib/modules/pipelines/service";
import { KanbanBoard } from "./kanban-board";
import { cn } from "@/lib/cn";

export default async function PipelineBoardPage({ params }: PageProps<"/pipeline/[pipelineId]">) {
  const { pipelineId } = await params;
  const session = await requirePermission("leads:view");

  const [pipeline, allPipelines] = await Promise.all([
    getPipelineForBoard(session.user.organizationId, pipelineId),
    listPipelines(session.user.organizationId),
  ]);
  if (!pipeline) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Pipeline</h1>
        <Link href="/settings/pipelines" className="text-sm text-primary hover:underline">
          Manage pipelines
        </Link>
      </div>

      <div className="flex gap-1 border-b border-border">
        {allPipelines.map((p) => (
          <Link
            key={p.id}
            href={`/pipeline/${p.id}`}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium",
              p.id === pipelineId ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground",
            )}
          >
            {p.name}
          </Link>
        ))}
      </div>

      <KanbanBoard
        pipelineId={pipeline.id}
        stages={pipeline.stages.map((s) => ({
          id: s.id,
          name: s.name,
          isWon: s.isWon,
          isLost: s.isLost,
          leads: s.leads.map((l) => ({
            id: l.id,
            contact: { firstName: l.contact.firstName, lastName: l.contact.lastName },
            property: l.property ? { addressLine1: l.property.addressLine1, city: l.property.city } : null,
            assignedUser: l.assignedUser ? { name: l.assignedUser.name } : null,
            motivation: l.motivation,
          })),
        }))}
      />
    </div>
  );
}
