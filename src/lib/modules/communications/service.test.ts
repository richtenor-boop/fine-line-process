import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/db";
import { registerOrganization } from "@/lib/modules/organizations/service";
import { createLead } from "@/lib/modules/leads/service";
import { sendSms, logCall, listCommunicationsForLead } from "./service";
import { setSmsOptOutStatus, setDncStatus } from "@/lib/modules/compliance/service";
import { ComplianceBlockedError } from "@/lib/modules/compliance/service";

/** See src/lib/modules/organizations/service.test.ts for the RUN_DB_TESTS opt-in rationale. */
const runDbTests = process.env.RUN_DB_TESTS === "1";

async function makeLeadWithPhone(orgSuffix: string) {
  const { organization, owner } = await registerOrganization({
    organizationName: `Comms Test Org ${orgSuffix} ${Date.now()}`,
    ownerName: "Test Owner",
    ownerEmail: `owner-${orgSuffix}-${Date.now()}@test.local`,
    ownerPassword: "correct-horse-battery-staple",
  });
  const lead = await createLead(
    organization.id,
    { contactMode: "new", firstName: "Test", lastName: "Seller", phone: "5555550100", propertyMode: "none", motivation: "UNKNOWN" },
    owner.id,
  );
  const fullLead = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id }, include: { contact: { include: { phoneNumbers: true } } } });
  return { organization, owner, lead: fullLead, phoneId: fullLead.contact.phoneNumbers[0].id };
}

describe.skipIf(!runDbTests)("communications compliance gates", () => {
  it("blocks sendSms once the number has opted out", async () => {
    const { organization, owner, lead, phoneId } = await makeLeadWithPhone("sms");

    await sendSms(organization.id, owner.id, { leadId: lead.id, phoneNumberId: phoneId, body: "Hi there" });

    await setSmsOptOutStatus(organization.id, phoneId, true);

    await expect(
      sendSms(organization.id, owner.id, { leadId: lead.id, phoneNumberId: phoneId, body: "Second message" }),
    ).rejects.toThrow(ComplianceBlockedError);
  });

  it("blocks an outbound call once the number is marked DNC, but still allows logging an inbound call", async () => {
    const { organization, owner, lead, phoneId } = await makeLeadWithPhone("call");
    await setDncStatus(organization.id, phoneId, true);

    await expect(
      logCall(organization.id, owner.id, { leadId: lead.id, phoneNumberId: phoneId, direction: "OUTBOUND" }),
    ).rejects.toThrow(ComplianceBlockedError);

    const inbound = await logCall(organization.id, owner.id, {
      leadId: lead.id,
      phoneNumberId: phoneId,
      direction: "INBOUND",
      disposition: "INTERESTED",
    });
    expect(inbound.direction).toBe("INBOUND");
  });

  it("merges calls and SMS into one chronological thread for the lead", async () => {
    const { organization, owner, lead, phoneId } = await makeLeadWithPhone("thread");

    await sendSms(organization.id, owner.id, { leadId: lead.id, phoneNumberId: phoneId, body: "First outbound text" });
    await logCall(organization.id, owner.id, { leadId: lead.id, phoneNumberId: phoneId, direction: "OUTBOUND", disposition: "FOLLOW_UP" });

    const events = await listCommunicationsForLead(organization.id, lead.id);
    expect(events.map((e) => e.kind).sort()).toEqual(["call", "sms"]);
  });
});
