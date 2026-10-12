"use server";

import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { generateContractSchema } from "./schema";
import { generateContract } from "./service";

export interface GenerateContractState {
  error?: string;
}

export async function generateContractAction(
  _prev: GenerateContractState,
  formData: FormData,
): Promise<GenerateContractState> {
  const session = await requirePermission("deals:edit");
  const raw = Object.fromEntries([...formData.entries()].filter(([, v]) => v !== ""));
  const parsed = generateContractSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };

  let contract;
  try {
    contract = await generateContract(session.user.organizationId, session.user.id, parsed.data);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not generate the contract." };
  }

  await writeAuditLog({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: "contract.generated",
    entityType: "GeneratedContract",
    entityId: contract.id,
    newValue: { type: contract.type },
  });
  redirect(`/contracts/${contract.id}`);
}
