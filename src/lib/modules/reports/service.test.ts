import { describe, it, expect } from "vitest";
import { registerOrganization } from "@/lib/modules/organizations/service";
import { createMarketingCost } from "@/lib/modules/marketing-costs/service";
import { getFinancialsReport, getLeadsBySource } from "./service";
import { prisma } from "@/lib/db";

/** See src/lib/modules/organizations/service.test.ts for the RUN_DB_TESTS opt-in rationale. */
const runDbTests = process.env.RUN_DB_TESTS === "1";

describe.skipIf(!runDbTests)("reports", () => {
  it("computes cost per lead from logged marketing spend and lead volume in the range", async () => {
    const { organization, owner } = await registerOrganization({
      organizationName: `Report Test Org ${Date.now()}`,
      ownerName: "Test Owner",
      ownerEmail: `owner-${Date.now()}@test.local`,
      ownerPassword: "correct-horse-battery-staple",
    });

    const now = new Date();
    const yesterday = new Date(now.getTime() - 86400000);
    const range = { from: new Date(now.getTime() - 7 * 86400000), to: now };

    await createMarketingCost(organization.id, owner.id, {
      description: "Direct mail",
      amount: 500,
      incurredOn: yesterday.toISOString().slice(0, 10),
    });

    const defaultPipeline = await prisma.pipeline.findFirstOrThrow({ where: { organizationId: organization.id } });
    const firstStage = await prisma.pipelineStage.findFirstOrThrow({ where: { pipelineId: defaultPipeline.id }, orderBy: { order: "asc" } });
    const contact = await prisma.contact.create({
      data: { organizationId: organization.id, firstName: "Test", lastName: "Lead", type: "SELLER" },
    });
    await prisma.lead.create({
      data: {
        organizationId: organization.id,
        contactId: contact.id,
        pipelineId: defaultPipeline.id,
        stageId: firstStage.id,
        motivation: "UNKNOWN",
      },
    });

    const financials = await getFinancialsReport(organization.id, range);
    expect(financials.marketingSpend).toBe(500);
    expect(financials.newLeadsCount).toBe(1);
    expect(financials.costPerLead).toBe(500);
  });

  it("groups leads by source name, falling back to '(No source)' when unset", async () => {
    const { organization, owner } = await registerOrganization({
      organizationName: `Report Source Org ${Date.now()}`,
      ownerName: "Test Owner",
      ownerEmail: `owner-${Date.now()}@test.local`,
      ownerPassword: "correct-horse-battery-staple",
    });
    const { createLead } = await import("@/lib/modules/leads/service");

    await createLead(
      organization.id,
      { contactMode: "new", firstName: "No", lastName: "Source", propertyMode: "none", motivation: "UNKNOWN" },
      owner.id,
    );
    await createLead(
      organization.id,
      {
        contactMode: "new",
        firstName: "Has",
        lastName: "Source",
        propertyMode: "none",
        motivation: "UNKNOWN",
        leadSourceName: "Direct Mail",
      },
      owner.id,
    );

    const range = { from: new Date(Date.now() - 86400000), to: new Date() };
    const bySource = await getLeadsBySource(organization.id, range);
    expect(bySource.find((r) => r.label === "Direct Mail")?.count).toBe(1);
    expect(bySource.find((r) => r.label === "(No source)")?.count).toBe(1);
  });
});
