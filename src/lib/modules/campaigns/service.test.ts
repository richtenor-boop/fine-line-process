import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/db";
import { registerOrganization } from "@/lib/modules/organizations/service";
import { createLead } from "@/lib/modules/leads/service";
import { createCampaign, addCampaignStep, enrollLead, processDueCampaignEnrollments } from "./service";

/** See src/lib/modules/organizations/service.test.ts for the RUN_DB_TESTS opt-in rationale. */
const runDbTests = process.env.RUN_DB_TESTS === "1";

describe.skipIf(!runDbTests)("campaign progression", () => {
  it("processes a due SMS step immediately (0-day delay) but not a step scheduled for later", async () => {
    const { organization, owner } = await registerOrganization({
      organizationName: `Campaign Test Org ${Date.now()}`,
      ownerName: "Test Owner",
      ownerEmail: `owner-${Date.now()}@test.local`,
      ownerPassword: "correct-horse-battery-staple",
    });

    const campaign = await createCampaign(organization.id, owner.id, {
      name: "Nurture",
      respectQuietHours: false,
      respectBusinessHours: false,
    });
    await addCampaignStep(organization.id, { campaignId: campaign.id, channel: "SMS", delayDays: 0, templateBody: "Day 0 hi" });
    await addCampaignStep(organization.id, { campaignId: campaign.id, channel: "SMS", delayDays: 5, templateBody: "Day 5 follow-up" });

    const lead = await createLead(
      organization.id,
      { contactMode: "new", firstName: "Camp", lastName: "Aigner", phone: "5555550123", propertyMode: "none", motivation: "UNKNOWN" },
      owner.id,
    );
    await enrollLead(organization.id, campaign.id, lead.id);

    const result = await processDueCampaignEnrollments(organization.id, owner.id);
    expect(result.processed).toBe(1); // only the 0-day step is due

    const enrollment = await prisma.campaignEnrollment.findUniqueOrThrow({
      where: { campaignId_leadId: { campaignId: campaign.id, leadId: lead.id } },
    });
    expect(enrollment.currentStepOrder).toBe(1);
    expect(enrollment.status).toBe("ACTIVE");

    const messages = await prisma.smsMessage.findMany({ where: { leadId: lead.id } });
    expect(messages).toHaveLength(1);
    expect(messages[0].body).toBe("Day 0 hi");
  });

  it("marks the enrollment COMPLETED after its last step runs", async () => {
    const { organization, owner } = await registerOrganization({
      organizationName: `Campaign Complete Org ${Date.now()}`,
      ownerName: "Test Owner",
      ownerEmail: `owner-${Date.now()}@test.local`,
      ownerPassword: "correct-horse-battery-staple",
    });

    const campaign = await createCampaign(organization.id, owner.id, {
      name: "One step",
      respectQuietHours: false,
      respectBusinessHours: false,
    });
    await addCampaignStep(organization.id, { campaignId: campaign.id, channel: "SMS", delayDays: 0, templateBody: "Only step" });

    const lead = await createLead(
      organization.id,
      { contactMode: "new", firstName: "Solo", lastName: "Step", phone: "5555550199", propertyMode: "none", motivation: "UNKNOWN" },
      owner.id,
    );
    await enrollLead(organization.id, campaign.id, lead.id);
    await processDueCampaignEnrollments(organization.id, owner.id);

    const enrollment = await prisma.campaignEnrollment.findUniqueOrThrow({
      where: { campaignId_leadId: { campaignId: campaign.id, leadId: lead.id } },
    });
    expect(enrollment.status).toBe("COMPLETED");
  });
});
