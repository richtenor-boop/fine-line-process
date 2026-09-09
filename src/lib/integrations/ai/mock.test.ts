import { describe, it, expect } from "vitest";
import { mockAiProvider } from "./mock";

describe("mock AI provider (deterministic heuristic, no DB/network needed)", () => {
  it("scores a high-motivation lead with equity and an appointment higher than a cold, low-motivation one", async () => {
    const strong = await mockAiProvider.scoreLead({
      motivation: "HIGH",
      timeline: "ASAP, needs to sell in 2 weeks",
      askingPrice: 200000,
      daysSinceCreated: 1,
      hasUpcomingAppointment: true,
      openTaskCount: 2,
      propertyEquity: 150000,
      tagNames: ["Motivated Seller"],
      recentNoteBodies: ["Spoke on the phone, very interested"],
    });

    const weak = await mockAiProvider.scoreLead({
      motivation: "LOW",
      timeline: null,
      askingPrice: null,
      daysSinceCreated: 30,
      hasUpcomingAppointment: false,
      openTaskCount: 0,
      propertyEquity: 5000,
      tagNames: [],
      recentNoteBodies: [],
    });

    expect(strong.score).toBeGreaterThan(weak.score);
    expect(strong.motivationLabel).toBe("High");
    expect(strong.reasons.length).toBeGreaterThan(0);
    expect(strong.recommendedAction).toBeTruthy();
  });

  it("is deterministic — identical input produces identical output", async () => {
    const input = {
      motivation: "MEDIUM" as const,
      timeline: null,
      askingPrice: null,
      daysSinceCreated: 5,
      hasUpcomingAppointment: false,
      openTaskCount: 1,
      propertyEquity: 60000,
      tagNames: [],
      recentNoteBodies: [],
    };
    const a = await mockAiProvider.scoreLead(input);
    const b = await mockAiProvider.scoreLead(input);
    expect(a).toEqual(b);
  });

  it("summarizes an empty transcript without erroring", async () => {
    const result = await mockAiProvider.summarize({ transcriptLines: [], context: "test" });
    expect(result.summary).toContain("No messages");
  });
});
