"use server";

import { requirePermission } from "@/lib/rbac";
import { searchContacts } from "./service";

export async function searchContactsAction(query: string) {
  const session = await requirePermission("contacts:view");
  const results = await searchContacts(session.user.organizationId, query);
  return results.map((c) => ({
    id: c.id,
    name: `${c.firstName} ${c.lastName}`,
    detail: c.emailAddresses[0]?.email ?? c.phoneNumbers[0]?.number ?? "",
  }));
}
