import { describe, it, expect } from "vitest";
import { registerOrganization } from "@/lib/modules/organizations/service";
import { importLeadsBatch } from "./service";
import type { ImportRow } from "./schema";

/** See src/lib/modules/organizations/service.test.ts for the RUN_DB_TESTS opt-in rationale. */
const runDbTests = process.env.RUN_DB_TESTS === "1";

describe.skipIf(!runDbTests)("CSV lead import", () => {
  it("creates leads for valid rows and reports errors for invalid ones", async () => {
    const { organization, owner } = await registerOrganization({
      organizationName: `Import Test Org ${Date.now()}`,
      ownerName: "Test Owner",
      ownerEmail: `owner-${Date.now()}@test.local`,
      ownerPassword: "correct-horse-battery-staple",
    });

    const rows: ImportRow[] = [
      { fullName: "Harold Devane", phone: "4045550142", addressLine1: "118 Persimmon Ridge Rd", city: "Decatur", state: "GA", zip: "30030" },
      { fullName: "", addressLine1: "No Name Ln", city: "Decatur", state: "GA", zip: "30030" }, // missing name
      { fullName: "Partial Address", addressLine1: "123 Main St" }, // incomplete address
      { fullName: "No Property Yolanda" }, // valid: no property at all
    ];

    const results = await importLeadsBatch(organization.id, owner.id, rows, 0, "skip");

    expect(results[0]).toMatchObject({ rowIndex: 0, status: "created" });
    expect(results[1]).toMatchObject({ rowIndex: 1, status: "error" });
    expect(results[2]).toMatchObject({ rowIndex: 2, status: "error" });
    expect(results[3]).toMatchObject({ rowIndex: 3, status: "created" });
  });

  it("skips a duplicate contact by phone under the 'skip' strategy, creates a second lead under 'create'", async () => {
    const { organization, owner } = await registerOrganization({
      organizationName: `Import Dup Org ${Date.now()}`,
      ownerName: "Test Owner",
      ownerEmail: `owner-${Date.now()}@test.local`,
      ownerPassword: "correct-horse-battery-staple",
    });

    const row: ImportRow = { fullName: "Repeat Seller", phone: "5555550100" };

    const first = await importLeadsBatch(organization.id, owner.id, [row], 0, "skip");
    expect(first[0].status).toBe("created");

    const secondSkip = await importLeadsBatch(organization.id, owner.id, [row], 0, "skip");
    expect(secondSkip[0].status).toBe("skipped_duplicate");

    const secondCreate = await importLeadsBatch(organization.id, owner.id, [row], 0, "create");
    expect(secondCreate[0].status).toBe("created");
  });
});
