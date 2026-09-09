import "server-only";
import { prisma } from "@/lib/db";
import { PIPELINE_TEMPLATES } from "./templates";
import type { CreatePipelineInput } from "./schema";

export async function listPipelines(organizationId: string) {
  return prisma.pipeline.findMany({
    where: { organizationId },
    include: {
      stages: { orderBy: { order: "asc" }, include: { _count: { select: { leads: true } } } },
    },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}

export async function getPipelineForBoard(organizationId: string, pipelineId: string) {
  return prisma.pipeline.findFirst({
    where: { id: pipelineId, organizationId },
    include: {
      stages: {
        orderBy: { order: "asc" },
        include: {
          leads: {
            where: { deletedAt: null },
            include: { contact: true, property: true, assignedUser: true },
            orderBy: { updatedAt: "desc" },
          },
        },
      },
    },
  });
}

export async function getDefaultPipeline(organizationId: string) {
  return prisma.pipeline.findFirst({ where: { organizationId, isDefault: true } });
}

export async function createPipeline(organizationId: string, input: CreatePipelineInput) {
  const stages = input.useTemplate
    ? PIPELINE_TEMPLATES[input.type]
    : [{ name: "New" }, { name: "Closed" }];

  return prisma.pipeline.create({
    data: {
      organizationId,
      name: input.name,
      type: input.type,
      stages: {
        create: stages.map((s, index) => ({
          name: s.name,
          order: index,
          isWon: s.isWon ?? false,
          isLost: s.isLost ?? false,
        })),
      },
    },
  });
}

export async function addStage(organizationId: string, pipelineId: string, name: string) {
  const pipeline = await prisma.pipeline.findFirst({ where: { id: pipelineId, organizationId } });
  if (!pipeline) throw new Error("Pipeline does not belong to this organization.");

  const maxOrder = await prisma.pipelineStage.aggregate({
    where: { pipelineId },
    _max: { order: true },
  });

  return prisma.pipelineStage.create({
    data: { pipelineId, name, order: (maxOrder._max.order ?? -1) + 1 },
  });
}

export async function renameStage(organizationId: string, stageId: string, name: string) {
  const stage = await prisma.pipelineStage.findFirst({
    where: { id: stageId, pipeline: { organizationId } },
  });
  if (!stage) throw new Error("Stage does not belong to this organization.");
  return prisma.pipelineStage.update({ where: { id: stageId }, data: { name } });
}

/** Swaps this stage's order with its immediate neighbor. */
export async function moveStage(organizationId: string, stageId: string, direction: "up" | "down") {
  const stage = await prisma.pipelineStage.findFirst({
    where: { id: stageId, pipeline: { organizationId } },
  });
  if (!stage) throw new Error("Stage does not belong to this organization.");

  const neighbor = await prisma.pipelineStage.findFirst({
    where: {
      pipelineId: stage.pipelineId,
      order: direction === "up" ? { lt: stage.order } : { gt: stage.order },
    },
    orderBy: { order: direction === "up" ? "desc" : "asc" },
  });
  if (!neighbor) return;

  await prisma.$transaction([
    prisma.pipelineStage.update({ where: { id: stage.id }, data: { order: neighbor.order } }),
    prisma.pipelineStage.update({ where: { id: neighbor.id }, data: { order: stage.order } }),
  ]);
}

export async function deleteStage(organizationId: string, stageId: string) {
  const stage = await prisma.pipelineStage.findFirst({
    where: { id: stageId, pipeline: { organizationId } },
    include: { _count: { select: { leads: true } } },
  });
  if (!stage) throw new Error("Stage does not belong to this organization.");
  if (stage._count.leads > 0) {
    throw new Error("Move or remove the leads in this stage before deleting it.");
  }

  const stageCount = await prisma.pipelineStage.count({ where: { pipelineId: stage.pipelineId } });
  if (stageCount <= 1) throw new Error("A pipeline must have at least one stage.");

  await prisma.pipelineStage.delete({ where: { id: stageId } });
}

export async function setDefaultPipeline(organizationId: string, pipelineId: string) {
  const pipeline = await prisma.pipeline.findFirst({ where: { id: pipelineId, organizationId } });
  if (!pipeline) throw new Error("Pipeline does not belong to this organization.");

  await prisma.$transaction([
    prisma.pipeline.updateMany({ where: { organizationId }, data: { isDefault: false } }),
    prisma.pipeline.update({ where: { id: pipelineId }, data: { isDefault: true } }),
  ]);
}
