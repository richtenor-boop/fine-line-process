import "server-only";
import type { AiProvider, LeadScoreInput, LeadScoreResult, SummarizeInput, SummarizeResult } from "./types";

/**
 * Deterministic, rule-based — no network call, same input always produces the same output.
 * Always available; used whenever ANTHROPIC_API_KEY isn't configured. Good enough to make the
 * feature genuinely useful in dev/demo (the source spec's own worked example in §19 is exactly
 * this kind of weighted-factor reasoning), not just a placeholder.
 */
export const mockAiProvider: AiProvider = {
  name: "mock",
  isLive: false,

  async scoreLead(input: LeadScoreInput): Promise<LeadScoreResult> {
    let score = 50;
    const reasons: string[] = [];

    const motivationWeight: Record<string, number> = { LOW: -5, MEDIUM: 10, HIGH: 25, UNKNOWN: 0 };
    score += motivationWeight[input.motivation] ?? 0;
    if (input.motivation === "HIGH") reasons.push("Seller-reported motivation is high.");
    if (input.motivation === "LOW") reasons.push("Seller-reported motivation is low.");

    if (input.timeline) {
      const urgent = /asap|immediately|urgent|\b[1-9]\d?\s*(day|week)/i.test(input.timeline);
      score += urgent ? 12 : 5;
      if (urgent) reasons.push(`Stated timeline suggests urgency ("${input.timeline}").`);
    }

    if (input.hasUpcomingAppointment) {
      score += 15;
      reasons.push("An appointment is already scheduled.");
    }

    if (input.daysSinceCreated > 14 && !input.hasUpcomingAppointment && input.recentNoteBodies.length === 0) {
      score -= 10;
      reasons.push(`No appointment or notes in ${input.daysSinceCreated} days — engagement may be stalling.`);
    }

    if (input.openTaskCount > 0) {
      score += 5;
      reasons.push(`${input.openTaskCount} open task(s) keeping this lead active.`);
    }

    if (input.propertyEquity !== null) {
      if (input.propertyEquity > 100000) {
        score += 15;
        reasons.push(`Significant estimated equity ($${input.propertyEquity.toLocaleString()}).`);
      } else if (input.propertyEquity > 50000) {
        score += 8;
      } else if (input.propertyEquity < 20000) {
        score -= 10;
        reasons.push("Low or negative estimated equity may limit deal viability.");
      }
    }

    const lowerTags = input.tagNames.map((t) => t.toLowerCase());
    if (lowerTags.some((t) => t.includes("motivated"))) {
      score += 10;
      reasons.push('Tagged "Motivated Seller".');
    }
    if (lowerTags.some((t) => t.includes("absentee"))) {
      score += 5;
      reasons.push("Tagged as an absentee owner.");
    }

    score = Math.max(0, Math.min(100, Math.round(score)));
    const motivationLabel = score >= 70 ? "High" : score >= 40 ? "Medium" : "Low";

    const recommendedAction =
      score >= 75
        ? "High priority — call the seller today and work toward scheduling a consultation."
        : score >= 45
          ? "Continue standard follow-up cadence; confirm next contact is on the calendar."
          : "Lower priority for now — keep in a nurture campaign and re-check after the next contact.";

    if (reasons.length === 0) reasons.push("No strong signals yet — limited information on file.");

    return { score, motivationLabel, reasons, recommendedAction };
  },

  async summarize(input: SummarizeInput): Promise<SummarizeResult> {
    if (input.transcriptLines.length === 0) {
      return { summary: "No messages yet to summarize." };
    }
    const last = input.transcriptLines.slice(-3);
    return {
      summary: `${input.context}. ${input.transcriptLines.length} message(s) exchanged. Most recent: ${last.join(" / ")}`,
    };
  },
};
