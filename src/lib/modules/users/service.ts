import "server-only";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import type { CreateUserInput } from "./schema";

export async function listUsers(organizationId: string) {
  return prisma.user.findMany({
    where: { organizationId, deletedAt: null },
    include: { role: true },
    orderBy: { createdAt: "asc" },
  });
}

function generateTemporaryPassword(): string {
  // 12 random bytes -> base64url, trimmed to a comfortable length. Shown once to the inviting
  // admin; there is no email-delivery path until the Phase 5 email provider ships (see
  // docs/06-integrations.md), so the admin is responsible for relaying it to the new user.
  return crypto.randomBytes(12).toString("base64url");
}

/** Creates and immediately activates a user, returning the one-time temporary password. */
export async function createUser(organizationId: string, input: CreateUserInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existing) throw new Error("A user with that email already exists.");

  const role = await prisma.role.findFirst({ where: { id: input.roleId, organizationId } });
  if (!role) throw new Error("Selected role does not belong to this organization.");

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);

  const user = await prisma.user.create({
    data: {
      organizationId,
      roleId: input.roleId,
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash,
      status: "ACTIVE",
    },
  });

  return { user, temporaryPassword };
}

export async function changeUserRole(organizationId: string, userId: string, roleId: string) {
  const role = await prisma.role.findFirst({ where: { id: roleId, organizationId } });
  if (!role) throw new Error("Selected role does not belong to this organization.");

  return prisma.user.update({
    where: { id: userId, organizationId },
    data: { roleId },
  });
}

export async function setUserStatus(organizationId: string, userId: string, status: "ACTIVE" | "SUSPENDED") {
  return prisma.user.update({
    where: { id: userId, organizationId },
    data: { status },
  });
}
