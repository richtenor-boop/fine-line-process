import "server-only";
import { prisma } from "@/lib/db";
import type { PermissionKey } from "@/lib/rbac/permissions";

export async function listRolesWithPermissions(organizationId: string) {
  return prisma.role.findMany({
    where: { organizationId },
    include: {
      rolePermissions: { include: { permission: true } },
      _count: { select: { users: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function listAllPermissions() {
  return prisma.permission.findMany({ orderBy: { key: "asc" } });
}

export async function setRolePermission(
  organizationId: string,
  roleId: string,
  permissionKey: PermissionKey,
  granted: boolean,
) {
  const role = await prisma.role.findFirst({ where: { id: roleId, organizationId } });
  if (!role) throw new Error("Role does not belong to this organization.");

  const permission = await prisma.permission.findUniqueOrThrow({ where: { key: permissionKey } });

  if (granted) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId: permission.id } },
      update: {},
      create: { roleId, permissionId: permission.id },
    });
  } else {
    await prisma.rolePermission.deleteMany({ where: { roleId, permissionId: permission.id } });
  }
}
