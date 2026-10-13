import "server-only";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, SYSTEM_ROLES } from "@/lib/rbac/permissions";
import { PIPELINE_TEMPLATES } from "@/lib/modules/pipelines/templates";
import type { RegisterInput, UpdateOrganizationInput } from "./schema";

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
  return base || "organization";
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  let suffix = 1;
  // Sequential existence check is fine at this scale (registration, not a hot path).
  while (await prisma.organization.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}

/**
 * Registers a brand-new organization: seeds the global permission catalog (idempotent — safe to
 * call even if prisma/seed.ts already ran), creates the 9 system roles with their default grants,
 * and creates the first user as Owner. Fully self-contained so the "Create Organization" flow
 * works against a freshly migrated, unseeded database.
 */
export async function registerOrganization(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.ownerEmail.toLowerCase() } });
  if (existing) {
    throw new Error("An account with that email already exists.");
  }

  const slug = await uniqueSlug(input.organizationName);
  const passwordHash = await hashPassword(input.ownerPassword);

  return prisma.$transaction(async (tx) => {
    for (const permission of PERMISSIONS) {
      await tx.permission.upsert({
        where: { key: permission.key },
        update: {},
        create: permission,
      });
    }

    const organization = await tx.organization.create({
      data: { name: input.organizationName, slug },
    });

    const roleIdByName = new Map<string, string>();
    for (const roleName of SYSTEM_ROLES) {
      const role = await tx.role.create({
        data: { organizationId: organization.id, name: roleName, isSystem: true },
      });
      roleIdByName.set(roleName, role.id);

      const grantedKeys = DEFAULT_ROLE_PERMISSIONS[roleName];
      const permissionRows = await tx.permission.findMany({ where: { key: { in: grantedKeys } } });
      await tx.rolePermission.createMany({
        data: permissionRows.map((p) => ({ roleId: role.id, permissionId: p.id })),
      });
    }

    const ownerRoleId = roleIdByName.get("Owner")!;
    const owner = await tx.user.create({
      data: {
        organizationId: organization.id,
        roleId: ownerRoleId,
        name: input.ownerName,
        email: input.ownerEmail.toLowerCase(),
        passwordHash,
        status: "ACTIVE",
      },
    });

    // Every org needs a default pipeline before a Lead can be created (Lead.pipelineId/stageId
    // are required) — see docs/05-mvp-plan.md Phase 2. Stage set comes from the same
    // PIPELINE_TEMPLATES.GENERAL that /settings/pipelines offers for additional pipelines
    // (Phase 3), so the two never drift apart.
    await tx.pipeline.create({
      data: {
        organizationId: organization.id,
        name: "General Acquisitions",
        type: "GENERAL",
        isDefault: true,
        stages: {
          create: PIPELINE_TEMPLATES.GENERAL.map((s, index) => ({
            name: s.name,
            order: index,
            isWon: s.isWon ?? false,
            isLost: s.isLost ?? false,
          })),
        },
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: organization.id,
        userId: owner.id,
        action: "organization.created",
        entityType: "Organization",
        entityId: organization.id,
      },
    });

    return { organization, owner };
  });
}

export async function getOrganization(organizationId: string) {
  return prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
}

export async function updateOrganization(organizationId: string, data: UpdateOrganizationInput) {
  return prisma.organization.update({ where: { id: organizationId }, data });
}

export async function getOrganizationCounts(organizationId: string) {
  const [users, roles, teams, leads, properties] = await Promise.all([
    prisma.user.count({ where: { organizationId, deletedAt: null } }),
    prisma.role.count({ where: { organizationId } }),
    prisma.team.count({ where: { organizationId } }),
    prisma.lead.count({ where: { organizationId, deletedAt: null } }),
    prisma.property.count({ where: { organizationId, deletedAt: null } }),
  ]);
  return { users, roles, teams, leads, properties };
}

/**
 * Self-serve sign-up creates a brand-new organization, so on a single-company install it should
 * only ever happen once: the first visitor becomes the Owner and everyone else is invited from
 * Settings → Users. Set ALLOW_REGISTRATION=true to keep /register open (multi-company hosting,
 * local development, end-to-end tests).
 */
export async function isRegistrationOpen(): Promise<boolean> {
  if (process.env.ALLOW_REGISTRATION === "true") return true;
  return (await prisma.organization.count()) === 0;
}
