/**
 * AI Assistant — source spec §19. Output is always advisory: nothing in this app acts on an AI
 * result automatically. A human reads a score/summary/recommendation and decides what to do with
 * it; automations never consume AI output as a trigger or condition.
 */

export interface LeadScoreInput {
  motivation: string;
  timeline: string | null;
  askingPrice: number | null;
  daysSinceCreated: number;
  hasUpcomingAppointment: boolean;
  openTaskCount: number;
  propertyEquity: number | null;
  tagNames: string[];
  recentNoteBodies: string[];
}

export interface LeadScoreResult {
  score: number; // 0-100
  motivationLabel: "Low" | "Medium" | "High";
  reasons: string[];
  recommendedAction: string;
}

export interface SummarizeInput {
  /** Chronological, oldest first — e.g. "You: ...", "Them: ..." lines. */
  transcriptLines: string[];
  context: string; // e.g. "SMS/call/email thread with Jane Doe about 123 Main St"
}

export interface SummarizeResult {
  summary: string;
}

export interface AiProvider {
  readonly name: string;
  readonly isLive: boolean;
  scoreLead(input: LeadScoreInput): Promise<LeadScoreResult>;
  summarize(input: SummarizeInput): Promise<SummarizeResult>;
}
