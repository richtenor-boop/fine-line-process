import { describe, it, expect } from "vitest";
import { registerOrganization } from "@/lib/modules/organizations/service";
import { createPipeline, listPipelines, addStage, deleteStage } from "./service";
import { PIPELINE_TEMPLATES } from "./templates";

/** See src/lib/modules/organizations/service.test.ts for the RUN_DB_TESTS opt-in rationale. */
const runDbTests = process.env.RUN_DB_TESTS === "1";

describe.skipIf(!runDbTests)("pipelines", () => {
  it("creates a specialized pipeline from its template with stages in order", async () => {
    const { organization } = await registerOrganization({
      organizationName: `Pipeline Test Org ${Date.now()}`,
      ownerName: "Test Owner",
      ownerEmail: `owner-${Date.now()}@test.local`,
      ownerPassword: "correct-horse-battery-staple",
    });

    const pipeline = await createPipeline(organization.id, {
      name: "Pre-Foreclosure",
      type: "PRE_FORECLOSURE",
      useTemplate: true,
    });

    const [found] = await listPipelines(organization.id).then((all) => all.filter((p) => p.id === pipeline.id));
    expect(found.stages.map((s) => s.name)).toEqual(PIPELINE_TEMPLATES.PRE_FORECLOSURE.map((s) => s.name));
  });

  it("refuses to delete a pipeline's only remaining stage", async () => {
    const { organization } = await registerOrganization({
      organizationName: `Pipeline Test Org 2 ${Date.now()}`,
      ownerName: "Test Owner",
      ownerEmail: `owner2-${Date.now()}@test.local`,
      ownerPassword: "correct-horse-battery-staple",
    });

    const pipeline = await createPipeline(organization.id, { name: "Blank", type: "GENERAL", useTemplate: false });
    const [pipelines] = await Promise.all([listPipelines(organization.id)]);
    const stages = pipelines.find((p) => p.id === pipeline.id)!.stages;

    // useTemplate: false creates exactly 2 stages ("New", "Closed") — delete down to one, then
    // the last delete should be refused.
    await deleteStage(organization.id, stages[1].id);
    await expect(deleteStage(organization.id, stages[0].id)).rejects.toThrow(/at least one stage/);
  });

  it("blocks deleting a stage that still holds leads", async () => {
    const { organization, owner } = await registerOrganization({
      organizationName: `Pipeline Test Org 3 ${Date.now()}`,
      ownerName: "Test Owner",
      ownerEmail: `owner3-${Date.now()}@test.local`,
      ownerPassword: "correct-horse-battery-staple",
    });

    const defaultPipeline = (await listPipelines(organization.id))[0];
    const firstStage = defaultPipeline.stages[0];

    const { createLead } = await import("@/lib/modules/leads/service");
    await createLead(
      organization.id,
      { contactMode: "new", firstName: "Test", lastName: "Lead", propertyMode: "none", motivation: "UNKNOWN" },
      owner.id,
    );

    await expect(addStage(organization.id, defaultPipeline.id, "Extra")).resolves.toBeTruthy();
    await expect(deleteStage(organization.id, firstStage.id)).rejects.toThrow(/Move or remove/);
  });
});
