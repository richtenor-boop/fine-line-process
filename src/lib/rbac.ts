import "server-only";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { PermissionKey } from "@/lib/rbac/permissions";

export class ForbiddenError extends Error {
  constructor(permissionKey: PermissionKey) {
    super(`Missing required permission: ${permissionKey}`);
    this.name = "ForbiddenError";
  }
}

export class UnauthenticatedError extends Error {
  constructor() {
    super("Not signed in");
    this.name = "UnauthenticatedError";
  }
}

/** Authenticated session's user, guaranteed present or throws. Does not check permissions. */
export async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new UnauthenticatedError();
  return session;
}

/**
 * The single enforcement point for authorization. Call at the top of every Server Action and
 * Route Handler that mutates or reads permission-gated data — never rely on a hidden UI element
 * as the enforcement point. See docs/04-rbac-matrix.md.
 */
export async function requirePermission(permissionKey: PermissionKey) {
  const session = await requireSession();
  const granted = await roleHasPermission(session.user.roleId, permissionKey);
  if (!granted) throw new ForbiddenError(permissionKey);
  return session;
}

export async function roleHasPermission(roleId: string, permissionKey: PermissionKey): Promise<boolean> {
  const grant = await prisma.rolePermission.findFirst({
    where: { roleId, permission: { key: permissionKey } },
    select: { roleId: true },
  });
  return grant !== null;
}

/** For UI-level hiding only (nicer UX) — never the security boundary. */
export async function currentUserHasPermission(permissionKey: PermissionKey): Promise<boolean> {
  const session = await auth();
  if (!session?.user) return false;
  return roleHasPermission(session.user.roleId, permissionKey);
}

/** Full set of granted permission keys for a role — used to filter nav items in one query. */
export async function getGrantedPermissionKeys(roleId: string): Promise<Set<PermissionKey>> {
  const grants = await prisma.rolePermission.findMany({
    where: { roleId },
    include: { permission: true },
  });
  return new Set(grants.map((g) => g.permission.key as PermissionKey));
}
