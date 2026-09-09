import { describe, it, expect } from "vitest";
import { registerOrganization } from "@/lib/modules/organizations/service";
import { createProperty } from "@/lib/modules/properties/service";
import {
  getPropertyDetails,
  upsertForeclosure,
  upsertTaxSale,
  createTaxSurplusClaim,
  createLien,
  deleteLien,
} from "./service";

/** See src/lib/modules/organizations/service.test.ts for the RUN_DB_TESTS opt-in rationale. */
const runDbTests = process.env.RUN_DB_TESTS === "1";

async function seedOrgAndProperty() {
  const { organization } = await registerOrganization({
    organizationName: `Property Details Test Org ${Date.now()}`,
    ownerName: "Test Owner",
    ownerEmail: `owner-${Date.now()}@test.local`,
    ownerPassword: "correct-horse-battery-staple",
  });
  const property = await createProperty(organization.id, {
    addressLine1: "123 Test St",
    city: "Testville",
    state: "TX",
    zip: "75001",
    propertyType: "SINGLE_FAMILY",
  });
  return { organizationId: organization.id, propertyId: property.id };
}

describe.skipIf(!runDbTests)("property-details specialized case + list data", () => {
  it("upserts a foreclosure case idempotently (one row per property)", async () => {
    const { organizationId, propertyId } = await seedOrgAndProperty();

    await upsertForeclosure(organizationId, { propertyId, status: "PRE_FORECLOSURE" });
    const updated = await upsertForeclosure(organizationId, {
      propertyId,
      status: "AUCTION_SCHEDULED",
      trusteeName: "Acme Trustee Co",
    });

    const details = await getPropertyDetails(organizationId, propertyId);
    expect(details.foreclosure?.id).toBe(updated.id);
    expect(details.foreclosure?.status).toBe("AUCTION_SCHEDULED");
    expect(details.foreclosure?.trusteeName).toBe("Acme Trustee Co");
  });

  it("nests tax surplus claims under a tax sale", async () => {
    const { organizationId, propertyId } = await seedOrgAndProperty();

    const taxSale = await upsertTaxSale(organizationId, { propertyId, status: "SURPLUS_AVAILABLE" });
    await createTaxSurplusClaim(organizationId, { taxSaleId: taxSale.id, status: "NEW", surplusAmount: 5000 });

    const details = await getPropertyDetails(organizationId, propertyId);
    expect(details.taxSale?.surplusClaims).toHaveLength(1);
    expect(details.taxSale?.surplusClaims[0]?.surplusAmount?.toString()).toBe("5000");
  });

  it("rejects mutations against a property from another organization", async () => {
    const { propertyId } = await seedOrgAndProperty();
    const other = await registerOrganization({
      organizationName: `Other Org ${Date.now()}`,
      ownerName: "Other Owner",
      ownerEmail: `owner-other-${Date.now()}@test.local`,
      ownerPassword: "correct-horse-battery-staple",
    });

    await expect(createLien(other.organization.id, { propertyId, holderName: "Cross-Tenant Lienholder" })).rejects.toThrow(
      /does not belong to this organization/,
    );
  });

  it("creates and deletes a lien, scoped to organization", async () => {
    const { organizationId, propertyId } = await seedOrgAndProperty();
    const lien = await createLien(organizationId, { propertyId, holderName: "County Tax Office", amount: 1200 });

    let details = await getPropertyDetails(organizationId, propertyId);
    expect(details.liens).toHaveLength(1);

    await deleteLien(organizationId, lien.id);
    details = await getPropertyDetails(organizationId, propertyId);
    expect(details.liens).toHaveLength(0);
  });
});
