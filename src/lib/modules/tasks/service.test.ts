import { describe, it, expect } from "vitest";
import { registerOrganization } from "@/lib/modules/organizations/service";
import { createTask, listTasks, setTaskStatus } from "./service";

/** See src/lib/modules/organizations/service.test.ts for the RUN_DB_TESTS opt-in rationale. */
const runDbTests = process.env.RUN_DB_TESTS === "1";

describe.skipIf(!runDbTests)("tasks", () => {
  it("creates a task and surfaces it in the assignee's 'mine' view, then in 'completed' once done", async () => {
    const { organization, owner } = await registerOrganization({
      organizationName: `Task Test Org ${Date.now()}`,
      ownerName: "Test Owner",
      ownerEmail: `owner-${Date.now()}@test.local`,
      ownerPassword: "correct-horse-battery-staple",
    });

    const task = await createTask(organization.id, owner.id, {
      title: "Call seller back",
      assignedUserId: owner.id,
      priority: "HIGH",
    });

    const mine = await listTasks(organization.id, "mine", owner.id);
    expect(mine.map((t) => t.id)).toContain(task.id);

    await setTaskStatus(organization.id, task.id, "COMPLETED");

    const mineAfter = await listTasks(organization.id, "mine", owner.id);
    expect(mineAfter.map((t) => t.id)).not.toContain(task.id);

    const completed = await listTasks(organization.id, "completed", owner.id);
    expect(completed.map((t) => t.id)).toContain(task.id);
  });

  it("does not let organization B see organization A's tasks", async () => {
    const a = await registerOrganization({
      organizationName: `Task Org A ${Date.now()}`,
      ownerName: "Owner A",
      ownerEmail: `owner-a-${Date.now()}@test.local`,
      ownerPassword: "correct-horse-battery-staple",
    });
    const b = await registerOrganization({
      organizationName: `Task Org B ${Date.now()}`,
      ownerName: "Owner B",
      ownerEmail: `owner-b-${Date.now()}@test.local`,
      ownerPassword: "correct-horse-battery-staple",
    });

    await createTask(a.organization.id, a.owner.id, { title: "Org A only task", priority: "MEDIUM" });

    const bTeamTasks = await listTasks(b.organization.id, "team", b.owner.id);
    expect(bTeamTasks.every((t) => t.title !== "Org A only task")).toBe(true);
  });
});
