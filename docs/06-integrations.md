# Fine Line Process — Third-Party Integration Requirements

No integration in this list is called from application code without an explicit provider
implementation behind the interfaces in `src/lib/integrations/`. Until credentials exist, every
capability below runs against its **mock** implementation: mocks log the attempted action to the
console and (where relevant) write the same database rows a real send would, so the rest of the
app — inbox, timelines, campaign progression — works identically in dev/demo and in production.
Every capability is tagged **IMPLEMENTED / MOCKED / PLANNED / REQUIRES THIRD-PARTY CREDENTIALS**
per [`../STATUS.md`](../STATUS.md); this doc lists what each future integration needs.

## SMS & Voice (Phase 5 — MOCKED, implemented)

- **Interface**: `src/lib/integrations/telephony/types.ts` — `sendSms()`, `placeCall()`.
  `getCallRecording()` and the inbound webhook handler contract are PLANNED, added alongside a
  real provider (recording literally doesn't exist without one).
- **Mock**: `src/lib/integrations/telephony/mock.ts` — logs and returns a realistic result shape;
  `src/lib/modules/communications/service.ts` persists the same rows a real send would.
- **Candidate provider**: Twilio (Programmable Messaging + Voice). Not implemented — the factory
  (`src/lib/integrations/telephony/index.ts`) falls back to mock and warns if `TWILIO_ACCOUNT_SID`
  is set without a real implementation behind it.
- **Requires**: Twilio Account SID, Auth Token (or API Key SID/Secret), a purchased phone number,
  A2P 10DLC campaign registration (required before SMS traffic flows in the US), a public webhook
  URL for inbound messages/calls and status callbacks, webhook signature validation secret.
- **Compliance dependency**: DNC/opt-out state (`PhoneNumber.isDncListed`, `.smsOptedOut`) is
  checked before every send, enforced in the service layer — see
  [08-security-checklist.md](08-security-checklist.md) §Compliance.

## Email (Phase 5 — MOCKED, implemented)

- **Interface**: `src/lib/integrations/email/types.ts` — `sendEmail()`. Inbound parse webhook is
  PLANNED, added alongside a real provider.
- **Mock**: `src/lib/integrations/email/mock.ts`, same pattern as telephony above.
- **Candidate provider**: SendGrid (or any transactional ESP). Not implemented.
- **Requires**: API key, verified sending domain (SPF/DKIM/DMARC), suppression-list sync.

## Calendar Sync (Phase 7, stretch)

- **Interface**: `src/lib/integrations/calendar/types.ts` — two-way event sync.
- **Candidate provider**: Google Calendar / Microsoft Graph.
- **Requires**: OAuth client ID/secret, per-user OAuth consent flow, webhook/push-channel renewal.

## E-Signature (Phase 7, stretch)

- **Interface**: `src/lib/integrations/esign/types.ts` — `createEnvelope()`, status webhook.
- **Candidate provider**: DocuSign / HelloSign.
- **Requires**: API credentials, account ID, webhook HMAC secret.

## Property & Contact Data Enrichment (Phase 9, stretch)

- **Interface**: `src/lib/integrations/enrichment/types.ts` — `lookupProperty()`,
  `lookupSkipTrace()`.
- **Candidate providers**: any licensed property-data or skip-tracing API (not selected — must be
  a licensed provider or authorized public-records source per the source spec; scraping restricted
  sites is out of scope permanently, not just for MVP).
- **Requires**: provider API key, per-lookup billing awareness (rate limit + cost tracking in
  `MarketingCost` or a dedicated ledger).

## Object Storage (Phase 7 — local adapter IMPLEMENTED, S3 REQUIRES CREDENTIALS)

- **Interface**: `src/lib/storage.ts` — `putObject()`, `getObject()`, `deleteObject()`.
- **Local adapter**: real, not mocked — genuinely reads/writes files under `.data/uploads/`
  (gitignored), so upload/preview/download work today with zero credentials. Document upload,
  the `/api/documents/[id]` preview/download route, and deletion all exercise it for real.
- **The one real gap**: local disk is ephemeral on most hosting platforms — files would not
  survive a redeploy/restart in production. That's the one thing a real bucket buys you here,
  unlike the Phase 5 providers where the mock never talks to a network at all.
- **Production candidate**: AWS S3 or S3-compatible (Cloudflare R2, MinIO).
- **Requires**: bucket name, region, access key/secret or IAM role, CORS policy for direct browser
  upload if that pattern is used. `getStorageAdapter()` already warns and falls back to local if
  `S3_BUCKET` is set without a real implementation behind it — same factory pattern as Phase 5.

## Webhooks (outbound, Phase 6 — IMPLEMENTED)

Fine Line Process can also act as a webhook *sender* (`/settings/webhooks`, the Automations "Send
Webhook" action) — this needed no third-party credentials, only that the org configures a
destination URL, so unlike SMS/Email/Voice it's a real send today, not a mock. Outbound payloads
are HMAC-SHA256-signed with a per-webhook secret (`src/lib/modules/webhooks/service.ts`) in the
`X-FineLine-Signature` header so receivers can verify authenticity. A receiver failure or timeout
(10s) is logged, never thrown — one broken webhook can't take down the automation run that
triggered it.

## AI Assistant (Phase 8 — IMPLEMENTED, both mock and real)

- **Interface**: `src/lib/integrations/ai/types.ts` — `scoreLead()`, `summarize()`.
- **This is the one integration with a real provider actually built**, not just mocked-and-
  documented like Twilio/SendGrid/S3: `src/lib/integrations/ai/anthropic.ts` calls the Claude API
  directly via `@anthropic-ai/sdk`. Set `ANTHROPIC_API_KEY` and lead scoring / conversation
  summaries call it for real; unset, `src/lib/integrations/ai/mock.ts`'s deterministic rule-based
  heuristic answers instead — same output shape, no network call, good enough to make the feature
  genuinely useful without a key.
- **Model**: `ANTHROPIC_MODEL` env var, defaults to `claude-sonnet-5`.
- **Features shipped**: Lead Scoring with reasoning and a recommended action (the Lead detail
  page's "AI Insights" card — matches source spec §19's worked example format exactly), and
  Conversation Summaries (a button on the Inbox thread page). The Automations "Generate AI
  Summary" action (§11) also works — it summarizes a lead's recent activity into a Note.
- **Features not built**: Missing Information Detection, Task Suggestions, Seller Objection
  Summaries, Pipeline Risk Detection, Offer Analysis — narrower §19 capabilities not implemented
  this phase; the interface/provider layer they'd sit behind already exists.
- **AI output is always advisory** — see source spec §19: nothing in this app acts on an AI result
  automatically. Lead scoring writes a score+reason a human reads; the "Generate AI Summary"
  automation action writes a Note a human reads. No automation condition or trigger ever consumes
  AI output, and no action is taken without a human explicitly clicking something first.

## Adding a real provider (checklist)

1. Implement the interface in `src/lib/integrations/<capability>/<provider>.ts`.
2. Add required env vars to `.env.example` and [07-environment-variables.md](07-environment-variables.md).
3. Wire the factory in `src/lib/integrations/<capability>/index.ts` to select the provider when its
   env vars are present, falling back to mock otherwise — never throw at boot for a missing
   optional integration.
4. Add a webhook signature-verification test if the provider calls back into the app.
5. Update `../STATUS.md` from MOCKED to IMPLEMENTED.
