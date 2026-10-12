import { describe, it, expect } from "vitest";
import { registerOrganization } from "@/lib/modules/organizations/service";
import { createProperty } from "@/lib/modules/properties/service";
import { createRepairEstimate } from "@/lib/modules/property-details/service";
import { getDealAnalysis, upsertDealAnalysis } from "./service";
import { upsertDealAnalysisSchema } from "./schema";

/** See src/lib/modules/organizations/service.test.ts for the RUN_DB_TESTS opt-in rationale. */
const runDbTests = process.env.RUN_DB_TESTS === "1";

async function seed(suffix: string) {
  const { organization, owner } = await registerOrganization({
    organizationName: `Deal Analyzer Org ${suffix} ${Date.now()}`,
    ownerName: "Test Owner",
    ownerEmail: `owner-da-${suffix}-${Date.now()}@test.local`,
    ownerPassword: "correct-horse-battery-staple",
  });
  const property = await createProperty(organization.id, {
    addressLine1: "9 Analyzer Ave",
    city: "Testville",
    state: "TX",
    zip: "75001",
    propertyType: "SINGLE_FAMILY",
  });
  return { organizationId: organization.id, userId: owner.id, propertyId: property.id };
}

describe.skipIf(!runDbTests)("deal analyzer persistence", () => {
  it("prefills repairs from itemized estimates without writing anything", async () => {
    const { organizationId, propertyId } = await seed("a");
    await createRepairEstimate(organizationId, { propertyId, category: "Roof", estimatedCost: 12000 });
    await createRepairEstimate(organizationId, { propertyId, category: "HVAC", estimatedCost: 6000 });

    const view = await getDealAnalysis(organizationId, propertyId);
    expect(view?.saved).toBe(false);
    expect(view?.inputs.repairCost).toBe(18000);
    expect(view?.inputs.maoPercent).toBe(70);
  });

  it("saves, then updates in place (one worksheet per property), keeping blanks as null", async () => {
    const { organizationId, userId, propertyId } = await seed("b");
    const input = upsertDealAnalysisSchema.parse({ propertyId, arv: "250000", repairCost: "40000", purchasePrice: "" });
    const first = await upsertDealAnalysis(organizationId, userId, input);
    const second = await upsertDealAnalysis(organizationId, userId, { ...input, purchasePrice: 120000 });
    expect(second.id).toBe(first.id);

    const view = await getDealAnalysis(organizationId, propertyId);
    expect(view?.saved).toBe(true);
    expect(view?.inputs.arv).toBe(250000);
    expect(view?.inputs.purchasePrice).toBe(120000);
    expect(view?.inputs.assignmentFee).toBeNull();
  });

  it("refuses to write to another organization's property", async () => {
    const a = await seed("c1");
    const b = await seed("c2");
    const input = upsertDealAnalysisSchema.parse({ propertyId: a.propertyId, arv: "100000" });
    await expect(upsertDealAnalysis(b.organizationId, b.userId, input)).rejects.toThrow("Property not found.");
    expect(await getDealAnalysis(b.organizationId, a.propertyId)).toBeNull();
  });
});
