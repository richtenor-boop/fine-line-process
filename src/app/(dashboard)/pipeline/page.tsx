import { redirect, notFound } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { listPipelines } from "@/lib/modules/pipelines/service";

export default async function PipelineIndexPage() {
  const session = await requirePermission("leads:view");
  const pipelines = await listPipelines(session.user.organizationId);

  const target = pipelines.find((p) => p.isDefault) ?? pipelines[0];
  if (!target) notFound();

  redirect(`/pipeline/${target.id}`);
}
