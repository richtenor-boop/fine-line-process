import "server-only";
import { prisma } from "@/lib/db";
import type { CreateMarketingCostInput } from "./schema";

export async function createMarketingCost(organizationId: string, createdById: string, input: CreateMarketingCostInput) {
  return prisma.marketingCost.create({
    data: {
      organizationId,
      description: input.description,
      amount: input.amount,
      incurredOn: new Date(input.incurredOn),
      campaignId: input.campaignId || null,
      createdById,
    },
  });
}

export async function listMarketingCosts(organizationId: string, from: Date, to: Date) {
  return prisma.marketingCost.findMany({
    where: { organizationId, incurredOn: { gte: from, lte: to } },
    include: { campaign: true },
    orderBy: { incurredOn: "desc" },
  });
}

export async function deleteMarketingCost(organizationId: string, costId: string) {
  const cost = await prisma.marketingCost.findFirst({ where: { id: costId, organizationId } });
  if (!cost) throw new Error("Marketing cost does not belong to this organization.");
  await prisma.marketingCost.delete({ where: { id: costId } });
}

export async function sumMarketingCosts(organizationId: string, from: Date, to: Date): Promise<number> {
  const result = await prisma.marketingCost.aggregate({
    where: { organizationId, incurredOn: { gte: from, lte: to } },
    _sum: { amount: true },
  });
  return Number(result._sum.amount ?? 0);
}
