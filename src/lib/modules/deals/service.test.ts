import { describe, it, expect } from "vitest";
import { registerOrganization } from "@/lib/modules/organizations/service";
import { createLead } from "@/lib/modules/leads/service";
import { createOffer, updateOfferStatus, createContract, updateContractStatus, createDeal, updateDealStage } from "./service";

/** See src/lib/modules/organizations/service.test.ts for the RUN_DB_TESTS opt-in rationale. */
const runDbTests = process.env.RUN_DB_TESTS === "1";

describe.skipIf(!runDbTests)("offer -> contract -> deal lifecycle", () => {
  it("refuses to create a contract from a non-accepted offer, and a deal from a non-signed contract", async () => {
    const { organization, owner } = await registerOrganization({
      organizationName: `Deal Test Org ${Date.now()}`,
      ownerName: "Test Owner",
      ownerEmail: `owner-${Date.now()}@test.local`,
      ownerPassword: "correct-horse-battery-staple",
    });
    const lead = await createLead(
      organization.id,
      { contactMode: "new", firstName: "Deal", lastName: "Flow", propertyMode: "none", motivation: "UNKNOWN" },
      owner.id,
    );

    const offer = await createOffer(organization.id, owner.id, { leadId: lead.id, amount: 150000 });
    await expect(createContract(organization.id, offer.id)).rejects.toThrow(/accepted offer/);

    await updateOfferStatus(organization.id, offer.id, "ACCEPTED");
    const contract = await createContract(organization.id, offer.id);
    await expect(createDeal(organization.id, owner.id, contract.id)).rejects.toThrow(/signed contract/);

    await updateContractStatus(organization.id, contract.id, "SIGNED");
    const deal = await createDeal(organization.id, owner.id, contract.id);
    expect(deal.leadId).toBe(lead.id);
    expect(deal.purchasePrice?.toString()).toBe("150000");

    const updated = await updateDealStage(organization.id, deal.id, "CLOSED_WON");
    expect(updated.closedAt).not.toBeNull();
  });
});
