import "server-only";
import { prisma } from "@/lib/db";

export async function listAuditLog(organizationId: string, limit = 100) {
  const logs = await prisma.auditLog.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const userIds = [...new Set(logs.map((l) => l.userId).filter((id): id is string => !!id))];
  const users = userIds.length
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } })
    : [];
  const userById = new Map(users.map((u) => [u.id, u]));

  return logs.map((log) => ({ ...log, user: log.userId ? (userById.get(log.userId) ?? null) : null }));
}
