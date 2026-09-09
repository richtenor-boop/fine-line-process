"use server";

import { requirePermission } from "@/lib/rbac";
import { prisma } from "@/lib/db";

export async function searchPropertiesAction(query: string) {
  const session = await requirePermission("properties:view");
  if (!query.trim()) return [];

  const properties = await prisma.property.findMany({
    where: {
      organizationId: session.user.organizationId,
      deletedAt: null,
      addressLine1: { contains: query, mode: "insensitive" },
    },
    take: 10,
    orderBy: { addressLine1: "asc" },
  });

  return properties.map((p) => ({
    id: p.id,
    name: p.addressLine1,
    detail: `${p.city}, ${p.state} ${p.zip}`,
  }));
}
