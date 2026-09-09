/**
 * Provider-agnostic telephony interface (SMS + Voice) — see docs/06-integrations.md §SMS & Voice.
 * Application code (src/lib/modules/communications) only ever talks to this interface, never to
 * a specific provider SDK, so swapping in Twilio later touches one file (this one's sibling
 * `twilio.ts`, once it exists) instead of every call site.
 */

export interface SendSmsInput {
  to: string;
  from: string;
  body: string;
}

export interface SendSmsResult {
  providerMessageSid: string;
  status: "SENT" | "FAILED";
}

export interface PlaceCallInput {
  to: string;
  from: string;
}

export interface PlaceCallResult {
  providerCallSid: string;
  status: "INITIATED" | "FAILED";
}

export interface TelephonyProvider {
  readonly name: string;
  readonly isLive: boolean; // false for the mock — never claim a mocked send is a real send
  sendSms(input: SendSmsInput): Promise<SendSmsResult>;
  placeCall(input: PlaceCallInput): Promise<PlaceCallResult>;
}
