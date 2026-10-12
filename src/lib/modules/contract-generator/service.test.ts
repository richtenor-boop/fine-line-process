import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/db";
import { registerOrganization } from "@/lib/modules/organizations/service";
import { createProperty } from "@/lib/modules/properties/service";
import { generateContract, getContractDefaults, listGeneratedContracts } from "./service";
import { generateContractSchema } from "./schema";

/** See src/lib/modules/organizations/service.test.ts for the RUN_DB_TESTS opt-in rationale. */
const runDbTests = process.env.RUN_DB_TESTS === "1";

async function seed(suffix: string) {
  const { organization, owner } = await registerOrganization({
    organizationName: `Contract Org ${suffix} ${Date.now()}`,
    ownerName: "Test Owner",
    ownerEmail: `owner-cg-${suffix}-${Date.now()}@test.local`,
    ownerPassword: "correct-horse-battery-staple",
  });
  const property = await createProperty(organization.id, {
    addressLine1: "80 Howard St NW",
    city: "Atlanta",
    state: "GA",
    zip: "30314",
    propertyType: "SINGLE_FAMILY",
  });
  return { organizationId: organization.id, userId: owner.id, propertyId: property.id };
}

describe.skipIf(!runDbTests)("contract generator", () => {
  it("saves the contract and a copy in the property's documents", async () => {
    const { organizationId, userId, propertyId } = await seed("a");
    const defaults = await getContractDefaults(organizationId, propertyId);
    expect(defaults?.propertyAddress).toBe("80 Howard St NW, Atlanta, GA 30314");

    const input = generateContractSchema.parse({
      propertyId,
      type: "CASH",
      sellerNames: "Jane Seller",
      buyerName: defaults!.buyerName,
      propertyAddress: defaults!.propertyAddress,
      purchasePrice: "90000",
      earnestMoney: "100",
      closingAgent: "Peachtree Title",
      closingDate: defaults!.closingDate,
      inspectionDays: "10",
    });
    const contract = await generateContract(organizationId, userId, input);
    expect(contract.body).toContain("$90,000.00");

    const doc = await prisma.document.findUniqueOrThrow({ where: { id: contract.documentId! } });
    expect(doc.propertyId).toBe(propertyId);
    expect(doc.category).toBe("PURCHASE_AGREEMENT");
    expect(doc.mimeType).toBe("text/html");
    expect(await listGeneratedContracts(organizationId, propertyId)).toHaveLength(1);
  });

  it("refuses another organization's property", async () => {
    const a = await seed("b1");
    const b = await seed("b2");
    const input = generateContractSchema.parse({
      propertyId: a.propertyId,
      type: "CASH",
      sellerNames: "X",
      buyerName: "Y",
      propertyAddress: "Z",
      purchasePrice: "1",
      earnestMoney: "1",
      closingAgent: "T",
      closingDate: "2026-12-01",
      inspectionDays: "5",
    });
    await expect(generateContract(b.organizationId, b.userId, input)).rejects.toThrow("Property not found.");
    expect(await getContractDefaults(b.organizationId, a.propertyId)).toBeNull();
  });
});
