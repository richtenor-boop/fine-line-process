import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/db";
import { registerOrganization } from "@/lib/modules/organizations/service";
import { createLead, getLead } from "@/lib/modules/leads/service";
import { createAutomation, addStep } from "./service";
import { runAutomationsForTrigger } from "./executor";

/** See src/lib/modules/organizations/service.test.ts for the RUN_DB_TESTS opt-in rationale. */
const runDbTests = process.env.RUN_DB_TESTS === "1";

describe.skipIf(!runDbTests)("automation executor", () => {
  it("adds a tag when a LEAD_CREATED automation fires, and does not fire when inactive", async () => {
    const { organization, owner } = await registerOrganization({
      organizationName: `Automation Test Org ${Date.now()}`,
      ownerName: "Test Owner",
      ownerEmail: `owner-${Date.now()}@test.local`,
      ownerPassword: "correct-horse-battery-staple",
    });

    const automation = await createAutomation(organization.id, owner.id, { name: "Tag new leads", triggerType: "LEAD_CREATED" });
    await addStep(organization.id, { automationId: automation.id, actionType: "ADD_TAG", tagName: "New Inbound" });

    const lead = await createLead(
      organization.id,
      { contactMode: "new", firstName: "Auto", lastName: "Matic", propertyMode: "none", motivation: "UNKNOWN" },
      owner.id,
    );

    // inactive automation — should not fire
    await runAutomationsForTrigger(organization.id, "LEAD_CREATED", lead.id);
    let fetched = await getLead(organization.id, lead.id);
    expect(fetched?.tags.length).toBe(0);

    await prisma.automation.update({ where: { id: automation.id }, data: { isActive: true } });
    await runAutomationsForTrigger(organization.id, "LEAD_CREATED", lead.id);

    fetched = await getLead(organization.id, lead.id);
    expect(fetched?.tags.map((t) => t.tag.name)).toContain("New Inbound");
  });

  it("only executes a step when its condition matches", async () => {
    const { organization, owner } = await registerOrganization({
      organizationName: `Automation Cond Org ${Date.now()}`,
      ownerName: "Test Owner",
      ownerEmail: `owner-${Date.now()}@test.local`,
      ownerPassword: "correct-horse-battery-staple",
    });

    const automation = await createAutomation(organization.id, owner.id, { name: "High motivation only", triggerType: "LEAD_UPDATED" });
    await prisma.automation.update({ where: { id: automation.id }, data: { isActive: true } });
    await addStep(organization.id, {
      automationId: automation.id,
      actionType: "ADD_TAG",
      tagName: "Hot Lead",
      conditionField: "motivation",
      conditionValue: "HIGH",
    });

    const lowLead = await createLead(
      organization.id,
      { contactMode: "new", firstName: "Low", lastName: "Motivation", propertyMode: "none", motivation: "LOW" },
      owner.id,
    );
    const highLead = await createLead(
      organization.id,
      { contactMode: "new", firstName: "High", lastName: "Motivation", propertyMode: "none", motivation: "HIGH" },
      owner.id,
    );

    await runAutomationsForTrigger(organization.id, "LEAD_UPDATED", lowLead.id);
    await runAutomationsForTrigger(organization.id, "LEAD_UPDATED", highLead.id);

    const lowFetched = await getLead(organization.id, lowLead.id);
    const highFetched = await getLead(organization.id, highLead.id);
    expect(lowFetched?.tags.length).toBe(0);
    expect(highFetched?.tags.map((t) => t.tag.name)).toContain("Hot Lead");
  });
});
