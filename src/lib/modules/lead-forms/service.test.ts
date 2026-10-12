import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/db";
import { registerOrganization } from "@/lib/modules/organizations/service";
import { createLeadForm, setLeadFormActive, submitLeadForm, getPublicLeadForm } from "./service";
import { publicSubmissionSchema, SUBMISSIONS_PER_IP_PER_HOUR } from "./schema";

/** See src/lib/modules/organizations/service.test.ts for the RUN_DB_TESTS opt-in rationale. */
const runDbTests = process.env.RUN_DB_TESTS === "1";

async function seed(suffix: string) {
  const { organization, owner } = await registerOrganization({
    organizationName: `Lead Form Org ${suffix} ${Date.now()}`,
    ownerName: "Test Owner",
    ownerEmail: `owner-lf-${suffix}-${Date.now()}@test.local`,
    ownerPassword: "correct-horse-battery-staple",
  });
  const form = await createLeadForm(organization.id, owner.id, {
    name: "Website",
    leadSourceName: "Website",
    assignedUserId: owner.id,
    thankYouMessage: "Thanks!",
  });
  return { organizationId: organization.id, ownerId: owner.id, form };
}

const submission = (overrides: Record<string, string> = {}) =>
  publicSubmissionSchema.parse({
    firstName: "Pat",
    lastName: "Seller",
    phone: `555-${Math.floor(Math.random() * 9_000_000 + 1_000_000)}`,
    email: "",
    addressLine1: "42 Form St",
    city: "Testville",
    state: "TX",
    zip: "75001",
    message: "Inherited the house, needs a roof.",
    ...overrides,
  });

describe("public submission validation", () => {
  it("requires a phone or an email", () => {
    expect(publicSubmissionSchema.safeParse({ firstName: "A", lastName: "B" }).success).toBe(false);
  });
  it("rejects a partial address", () => {
    expect(
      publicSubmissionSchema.safeParse({ firstName: "A", lastName: "B", phone: "1", addressLine1: "1 Main" }).success,
    ).toBe(false);
  });
});

describe.skipIf(!runDbTests)("lead capture forms", () => {
  it("creates a lead with contact, property, source, assignee, notification, and submission", async () => {
    const { organizationId, ownerId, form } = await seed("a");
    const result = await submitLeadForm(form.publicToken, submission(), null);
    expect(result.status).toBe("created");
    if (result.status !== "created") return;

    const lead = await prisma.lead.findUniqueOrThrow({
      where: { id: result.leadId },
      include: { property: true, leadSource: true, formSubmissions: true },
    });
    expect(lead.organizationId).toBe(organizationId);
    expect(lead.assignedUserId).toBe(ownerId);
    expect(lead.leadSource?.name).toBe("Website");
    expect(lead.property?.addressLine1).toBe("42 Form St");
    expect(lead.formSubmissions[0]?.message).toContain("roof");
    expect(await prisma.notification.count({ where: { userId: ownerId, entityId: lead.id } })).toBe(1);
    expect(result.thankYouMessage).toBe("Thanks!");
  });

  it("attaches a repeat submission to the existing lead instead of duplicating it", async () => {
    const { organizationId, form } = await seed("b");
    const first = await submitLeadForm(form.publicToken, submission({ phone: "", email: "Repeat@Test.local" }), null);
    const second = await submitLeadForm(form.publicToken, submission({ phone: "", email: "repeat@test.local" }), null);
    expect(second.status).toBe("matched_existing");
    if (first.status !== "created" || second.status !== "matched_existing") return;
    expect(second.leadId).toBe(first.leadId);
    expect(await prisma.lead.count({ where: { organizationId } })).toBe(1);
    expect(await prisma.leadFormSubmission.count({ where: { leadId: first.leadId } })).toBe(2);
  });

  it("rate-limits by IP hash and refuses inactive forms", async () => {
    const { form } = await seed("c");
    const ipHash = `test-ip-${Date.now()}`;
    for (let i = 0; i < SUBMISSIONS_PER_IP_PER_HOUR; i++) {
      expect((await submitLeadForm(form.publicToken, submission(), ipHash)).status).toBe("created");
    }
    expect((await submitLeadForm(form.publicToken, submission(), ipHash)).status).toBe("rate_limited");

    await setLeadFormActive(form.organizationId, form.id, false);
    expect(await getPublicLeadForm(form.publicToken)).toBeNull();
    expect((await submitLeadForm(form.publicToken, submission(), null)).status).toBe("not_found");
  });

  it("rejects an assignee from another organization", async () => {
    const a = await seed("d1");
    const b = await seed("d2");
    await expect(
      createLeadForm(a.organizationId, a.ownerId, { name: "X", leadSourceName: "Web", assignedUserId: b.ownerId }),
    ).rejects.toThrow("Assigned user not found.");
  });
});
