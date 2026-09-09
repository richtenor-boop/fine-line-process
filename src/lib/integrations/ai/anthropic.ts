import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { AiProvider, LeadScoreInput, LeadScoreResult, SummarizeInput, SummarizeResult } from "./types";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

function extractJson(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI response did not contain a JSON object.");
  return JSON.parse(match[0]);
}

export function createAnthropicProvider(apiKey: string): AiProvider {
  const client = new Anthropic({ apiKey });

  return {
    name: "anthropic",
    isLive: true,

    async scoreLead(input: LeadScoreInput): Promise<LeadScoreResult> {
      const message = await client.messages.create({
        model: MODEL,
        max_tokens: 500,
        system:
          "You are a real-estate acquisitions analyst. Score how promising a seller lead is for a follow-up call, " +
          "based only on the facts given. Respond with ONLY a JSON object: " +
          '{"score": <0-100 integer>, "motivationLabel": "Low"|"Medium"|"High", "reasons": [<short strings>], ' +
          '"recommendedAction": <one short sentence>}. Do not include any other text.',
        messages: [{ role: "user", content: JSON.stringify(input) }],
      });

      const text = message.content.find((block) => block.type === "text")?.text ?? "";
      const parsed = extractJson(text) as LeadScoreResult;
      return {
        score: Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0))),
        motivationLabel: parsed.motivationLabel,
        reasons: Array.isArray(parsed.reasons) ? parsed.reasons.slice(0, 6) : [],
        recommendedAction: String(parsed.recommendedAction || ""),
      };
    },

    async summarize(input: SummarizeInput): Promise<SummarizeResult> {
      const message = await client.messages.create({
        model: MODEL,
        max_tokens: 300,
        system:
          "Summarize this real-estate seller communication thread in 2-3 sentences for a busy acquisitions " +
          "rep catching up. Be factual and concise. Respond with plain text only, no preamble.",
        messages: [{ role: "user", content: `Context: ${input.context}\n\nTranscript:\n${input.transcriptLines.join("\n")}` }],
      });

      const text = message.content.find((block) => block.type === "text")?.text ?? "";
      return { summary: text.trim() || "Could not generate a summary." };
    },
  };
}
