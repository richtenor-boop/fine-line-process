import "server-only";
import { prisma } from "@/lib/db";
import type { DealInputs } from "./calc";
import type { UpsertDealAnalysisInput } from "./schema";

const num = (v: { toString(): string } | null | undefined): number | null => (v == null ? null : Number(v));

export interface DealAnalysisView {
  inputs: DealInputs;
  /** False when nothing is saved yet and `inputs` are prefilled suggestions from the property. */
  saved: boolean;
  updatedAt: Date | null;
}

/**
 * The saved worksheet, or — when none exists — a starting point prefilled from data already on
 * the property (its ARV and the sum of its itemized repair estimates). Prefills are suggestions
 * shown in the form; nothing is written until the user saves, so manual data is never overwritten.
 */
export async function getDealAnalysis(organizationId: string, propertyId: string): Promise<DealAnalysisView | null> {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, organizationId, deletedAt: null },
    include: { dealAnalysis: true, repairEstimates: { select: { estimatedCost: true } } },
  });
  if (!property) return null;

  const saved = property.dealAnalysis;
  if (saved) {
    return {
      saved: true,
      updatedAt: saved.updatedAt,
      inputs: {
        arv: num(saved.arv),
        repairCost: num(saved.repairCost),
        purchasePrice: num(saved.purchasePrice),
        maoPercent: Number(saved.maoPercent),
        assignmentFee: num(saved.assignmentFee),
        closingCostPercent: Number(saved.closingCostPercent),
        sellingCostPercent: Number(saved.sellingCostPercent),
        holdingMonths: saved.holdingMonths,
        monthlyHoldingCost: num(saved.monthlyHoldingCost),
        monthlyRent: num(saved.monthlyRent),
        monthlyExpenses: num(saved.monthlyExpenses),
      },
    };
  }

  const repairTotal = property.repairEstimates.reduce((sum, r) => sum + Number(r.estimatedCost), 0);
  return {
    saved: false,
    updatedAt: null,
    inputs: {
      arv: num(property.arv) ?? num(property.estimatedValue),
      repairCost: property.repairEstimates.length > 0 ? repairTotal : null,
      purchasePrice: null,
      maoPercent: 70,
      assignmentFee: null,
      closingCostPercent: 2,
      sellingCostPercent: 8,
      holdingMonths: 6,
      monthlyHoldingCost: null,
      monthlyRent: null,
      monthlyExpenses: null,
    },
  };
}

export async function upsertDealAnalysis(organizationId: string, userId: string, input: UpsertDealAnalysisInput) {
  const property = await prisma.property.findFirst({
    where: { id: input.propertyId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!property) throw new Error("Property not found.");

  const { propertyId, ...fields } = input;
  return prisma.dealAnalysis.upsert({
    where: { propertyId },
    create: { organizationId, propertyId, updatedById: userId, ...fields },
    update: { updatedById: userId, ...fields },
  });
}
