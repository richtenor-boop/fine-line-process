import { describe, it, expect } from "vitest";
import { registerOrganization } from "@/lib/modules/organizations/service";
import { createBuyer, findMatchingBuyers } from "./service";
import { prisma } from "@/lib/db";

/** See src/lib/modules/organizations/service.test.ts for the RUN_DB_TESTS opt-in rationale. */
const runDbTests = process.env.RUN_DB_TESTS === "1";

describe.skipIf(!runDbTests)("buyer matching", () => {
  it("matches a buyer whose criteria fit the property, and excludes one whose price range doesn't", async () => {
    const { organization, owner } = await registerOrganization({
      organizationName: `Buyer Test Org ${Date.now()}`,
      ownerName: "Test Owner",
      ownerEmail: `owner-${Date.now()}@test.local`,
      ownerPassword: "correct-horse-battery-staple",
    });

    const property = await prisma.property.create({
      data: {
        organizationId: organization.id,
        addressLine1: "1 Match St",
        city: "Decatur",
        state: "GA",
        zip: "30030",
        propertyType: "SINGLE_FAMILY",
        estimatedValue: 200000,
      },
    });

    const goodBuyer = await createBuyer(organization.id, owner.id, {
      contactMode: "new",
      firstName: "Good",
      lastName: "Fit",
      zipCodes: "30030",
      minPrice: 150000,
      maxPrice: 250000,
      propertyTypes: ["SINGLE_FAMILY"],
      isCashBuyer: true,
    });
    await createBuyer(organization.id, owner.id, {
      contactMode: "new",
      firstName: "Bad",
      lastName: "Fit",
      zipCodes: "30030",
      minPrice: 400000,
      propertyTypes: [],
      isCashBuyer: false,
    });

    const matches = await findMatchingBuyers(organization.id, property.id);
    expect(matches.map((m) => m.id)).toEqual([goodBuyer.id]);
  });
});
