import "server-only";
import { mockAiProvider } from "./mock";
import { createAnthropicProvider } from "./anthropic";
import type { AiProvider } from "./types";

/**
 * Unlike the Phase 5 telephony/email providers, a real implementation exists here — set
 * ANTHROPIC_API_KEY and lead scoring / summaries call the actual Claude API. Falls back to the
 * deterministic mock otherwise, so the features work (with a lower-fidelity heuristic) even
 * without a key.
 */
export function getAiProvider(): AiProvider {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) return createAnthropicProvider(apiKey);
  return mockAiProvider;
}
