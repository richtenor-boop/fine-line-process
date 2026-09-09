import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/db";
import { registerOrganization } from "@/lib/modules/organizations/service";
import { createLead, getLead } from "./service";

/**
 * Real-database integration test — see src/lib/modules/organizations/service.test.ts for the
 * RUN_DB_TESTS opt-in rationale. Covers Lead CRUD and tenant isolation (source spec §35).
 */
const runDbTests = process.env.RUN_DB_TESTS === "1";

describe.skipIf(!runDbTests)("lead creation + tenant isolation", () => {
  it("creates a lead with an inline new contact and property, in the org's default pipeline", async () => {
    const { organization, owner } = await registerOrganization({
      organizationName: `Lead Test Org ${Date.now()}`,
      ownerName: "Test Owner",
      ownerEmail: `owner-${Date.now()}@test.local`,
      ownerPassword: "correct-horse-battery-staple",
    });

    const lead = await createLead(
      organization.id,
      {
        contactMode: "new",
        firstName: "Harold",
        lastName: "Devane",
        phone: "4045550142",
        email: "harold.devane@example.com",
        propertyMode: "new",
        addressLine1: "118 Persimmon Ridge Rd",
        city: "Decatur",
        state: "GA",
        zip: "30030",
        motivation: "UNKNOWN",
      },
      owner.id,
    );

    const fetched = await getLead(organization.id, lead.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.contact.firstName).toBe("Harold");
    expect(fetched?.property?.addressLine1).toBe("118 Persimmon Ridge Rd");
    expect(fetched?.stage.name).toBe("New");
    expect(fetched?.stageHistory).toHaveLength(1);

    const ownerLink = await prisma.propertyOwner.findFirst({
      where: { propertyId: fetched!.propertyId!, contactId: fetched!.contactId },
    });
    expect(ownerLink).not.toBeNull();
  });

  it("does not let organization B read organization A's lead", async () => {
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

    const lead = await createLead(
      a.organization.id,
      {
        contactMode: "new",
        firstName: "Yolanda",
        lastName: "Pruitt",
        propertyMode: "none",
        motivation: "HIGH",
      },
      a.owner.id,
    );

    const found = await getLead(b.organization.id, lead.id);
    expect(found).toBeNull();
  });
});
