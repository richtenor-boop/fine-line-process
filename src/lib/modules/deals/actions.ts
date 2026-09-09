"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import {
  createOffer,
  updateOfferStatus,
  createContract,
  updateContractStatus,
  createDeal,
  updateDealStage,
  setDealBuyer,
  setDealSalePrice,
  addTransaction,
} from "./service";
import { createOfferSchema, addTransactionSchema, offerStatusEnum, contractStatusEnum, dealStageEnum } from "./schema";
import { writeAuditLog } from "@/lib/audit";
import { runAutomationsForTrigger } from "@/lib/modules/automations/executor";

export interface CreateOfferState {
  error?: string;
}

export async function createOfferAction(_prevState: CreateOfferState, formData: FormData): Promise<CreateOfferState> {
  const session = await requirePermission("deals:edit");

  const parsed = createOfferSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const offer = await createOffer(session.user.organizationId, session.user.id, parsed.data);
  await writeAuditLog({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: "offer.created",
    entityType: "Offer",
    entityId: offer.id,
    newValue: { amount: parsed.data.amount },
  });
  revalidatePath(`/leads/${parsed.data.leadId}`);
  return {};
}

export async function updateOfferStatusAction(formData: FormData): Promise<void> {
  const session = await requirePermission("deals:edit");
  const offerId = String(formData.get("offerId"));
  const leadId = String(formData.get("leadId"));
  const status = offerStatusEnum.parse(formData.get("status"));

  await updateOfferStatus(session.user.organizationId, offerId, status);
  await writeAuditLog({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: "offer.status_changed",
    entityType: "Offer",
    entityId: offerId,
    newValue: { status },
  });
  revalidatePath(`/leads/${leadId}`);
}

export async function createContractAction(formData: FormData): Promise<void> {
  const session = await requirePermission("deals:edit");
  const offerId = String(formData.get("offerId"));
  const leadId = String(formData.get("leadId"));

  const contract = await createContract(session.user.organizationId, offerId);
  await writeAuditLog({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: "contract.created",
    entityType: "Contract",
    entityId: contract.id,
  });
  revalidatePath(`/leads/${leadId}`);
}

export async function updateContractStatusAction(formData: FormData): Promise<void> {
  const session = await requirePermission("deals:edit");
  const contractId = String(formData.get("contractId"));
  const leadId = String(formData.get("leadId"));
  const status = contractStatusEnum.parse(formData.get("status"));

  await updateContractStatus(session.user.organizationId, contractId, status);
  await writeAuditLog({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: "contract.status_changed",
    entityType: "Contract",
    entityId: contractId,
    newValue: { status },
  });
  if (status === "SIGNED") {
    await runAutomationsForTrigger(session.user.organizationId, "CONTRACT_SIGNED", leadId);
  }
  revalidatePath(`/leads/${leadId}`);
}

export async function createDealAction(formData: FormData): Promise<void> {
  const session = await requirePermission("deals:edit");
  const contractId = String(formData.get("contractId"));
  const leadId = String(formData.get("leadId"));

  const deal = await createDeal(session.user.organizationId, session.user.id, contractId);
  await writeAuditLog({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: "deal.created",
    entityType: "Deal",
    entityId: deal.id,
  });
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/deals");
}

export async function updateDealStageAction(formData: FormData): Promise<void> {
  const session = await requirePermission("deals:edit");
  const dealId = String(formData.get("dealId"));
  const stage = dealStageEnum.parse(formData.get("stage"));

  await updateDealStage(session.user.organizationId, dealId, stage);
  await writeAuditLog({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: "deal.stage_changed",
    entityType: "Deal",
    entityId: dealId,
    newValue: { stage },
  });
  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/deals");
}

export async function setDealBuyerAction(formData: FormData): Promise<void> {
  const session = await requirePermission("deals:edit");
  const dealId = String(formData.get("dealId"));
  const buyerId = formData.get("buyerId")?.toString() || null;

  await setDealBuyer(session.user.organizationId, dealId, buyerId);
  revalidatePath(`/deals/${dealId}`);
}

export interface SetSalePriceState {
  error?: string;
}

export async function setDealSalePriceAction(_prevState: SetSalePriceState, formData: FormData): Promise<SetSalePriceState> {
  const session = await requirePermission("deals:edit");
  const dealId = String(formData.get("dealId"));
  const salePrice = Number(formData.get("salePrice"));
  const assignmentFee = formData.get("assignmentFee") ? Number(formData.get("assignmentFee")) : undefined;

  if (!Number.isFinite(salePrice)) return { error: "Enter a valid sale price." };

  await setDealSalePrice(session.user.organizationId, dealId, salePrice, assignmentFee);
  revalidatePath(`/deals/${dealId}`);
  return {};
}

export interface AddTransactionState {
  error?: string;
}

export async function addTransactionAction(_prevState: AddTransactionState, formData: FormData): Promise<AddTransactionState> {
  const session = await requirePermission("deals:edit");

  const parsed = addTransactionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  await addTransaction(session.user.organizationId, parsed.data);
  revalidatePath(`/deals/${parsed.data.dealId}`);
  return {};
}
