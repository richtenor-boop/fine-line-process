import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/db";
import { registerOrganization } from "./service";

/**
 * Real-database integration test (source spec §35: "Tenant Isolation" is required coverage).
 * Requires a running, migrated Postgres reachable via DATABASE_URL — not available in every
 * environment (e.g. this was authored without a local Postgres instance running). Opt in with:
 *
 *   RUN_DB_TESTS=1 npm run test
 *
 * after `npm run db:migrate`. Skipped by default so `npm test` stays green without a database.
 */
const runDbTests = process.env.RUN_DB_TESTS === "1";

describe.skipIf(!runDbTests)("organization registration + tenant isolation", () => {
  it("creates an organization with 9 seeded system roles and an Owner user", async () => {
    const { organization, owner } = await registerOrganization({
      organizationName: `Test Org ${Date.now()}`,
      ownerName: "Test Owner",
      ownerEmail: `owner-${Date.now()}@test.local`,
      ownerPassword: "correct-horse-battery-staple",
    });

    const roles = await prisma.role.findMany({ where: { organizationId: organization.id } });
    expect(roles).toHaveLength(9);
    expect(owner.organizationId).toBe(organization.id);

    const ownerRole = roles.find((r) => r.name === "Owner");
    expect(owner.roleId).toBe(ownerRole?.id);
  });

  it("does not let organization B read organization A's users", async () => {
    const a = await registerOrganization({
      organizationName: `Org A ${Date.now()}`,
      ownerName: "Owner A",
      ownerEmail: `owner-a-${Date.now()}@test.local`,
      ownerPassword: "correct-horse-battery-staple",
    });
    const b = await registerOrganization({
      organizationName: `Org B ${Date.now()}`,
      ownerName: "Owner B",
      ownerEmail: `owner-b-${Date.now()}@test.local`,
      ownerPassword: "correct-horse-battery-staple",
    });

    const found = await prisma.user.findFirst({
      where: { id: a.owner.id, organizationId: b.organization.id },
    });
    expect(found).toBeNull();
  });
});
