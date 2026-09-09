import "server-only";
import crypto from "node:crypto";
import type { TelephonyProvider, SendSmsInput, SendSmsResult, PlaceCallInput, PlaceCallResult } from "./types";

/**
 * Always available, used whenever no real telephony credentials are configured (dev, test, and
 * production until a provider is wired). Behaves correctly end-to-end — the caller gets a real
 * result shape and the app's data model fills in identically — it just never touches a real phone
 * network. See docs/06-integrations.md.
 */
export const mockTelephonyProvider: TelephonyProvider = {
  name: "mock",
  isLive: false,

  async sendSms(input: SendSmsInput): Promise<SendSmsResult> {
    console.log(`[mock telephony] SMS ${input.from} -> ${input.to}: ${input.body}`);
    return { providerMessageSid: `mock_sms_${crypto.randomUUID()}`, status: "SENT" };
  },

  async placeCall(input: PlaceCallInput): Promise<PlaceCallResult> {
    console.log(`[mock telephony] Call ${input.from} -> ${input.to}`);
    return { providerCallSid: `mock_call_${crypto.randomUUID()}`, status: "INITIATED" };
  },
};
