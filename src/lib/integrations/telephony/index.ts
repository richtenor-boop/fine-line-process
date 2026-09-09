import "server-only";
import { mockTelephonyProvider } from "./mock";
import type { TelephonyProvider } from "./types";

/**
 * Selects the real provider once `TWILIO_ACCOUNT_SID` (or equivalent) is present, falling back to
 * the mock otherwise — never throws at boot for a missing optional integration. No real provider
 * is implemented yet (see docs/06-integrations.md — Phase 5 requires third-party credentials to
 * go live); when one is added, it plugs in here without touching any caller.
 */
export function getTelephonyProvider(): TelephonyProvider {
  if (process.env.TWILIO_ACCOUNT_SID) {
    console.warn(
      "[telephony] TWILIO_ACCOUNT_SID is set, but no real Twilio provider is implemented yet — falling back to mock. See docs/06-integrations.md.",
    );
  }
  return mockTelephonyProvider;
}
