# Fine Line Process — Security Checklist

Status column: ✅ implemented in Phase 1, 🔜 designed-for / scaffolded but not fully enforced yet,
⬜ planned for the phase noted.

| Control | Status | Notes |
|---|---|---|
| Password hashing (bcrypt, cost ≥ 12) | ✅ | `src/lib/auth/password.ts` |
| Session strategy: signed JWT via Auth.js | ✅ | `AUTH_SECRET`; re-validated against DB, not trusted blindly |
| RBAC enforced server-side on every mutation | ✅ | `requirePermission()` — see [04-rbac-matrix.md](04-rbac-matrix.md) |
| Tenant isolation (organizationId scoping) | ✅ app-layer | Postgres RLS as defense-in-depth is 🔜 Phase 2 |
| Input validation (Zod) at every Server Action / Route Handler boundary | ✅ | schemas colocated per module |
| CSRF protection | ✅ | Same-site cookies + Auth.js built-in CSRF token for credential sign-in; Server Actions are POST-only and origin-checked by Next.js |
| XSS protection | ✅ | React auto-escaping; no `dangerouslySetInnerHTML` without sanitization; strict CSP 🔜 Phase 2 |
| SQL injection protection | ✅ | Prisma parameterized queries exclusively; no raw SQL string concatenation |
| Secure cookies | ✅ | `httpOnly`, `secure` (prod), `sameSite=lax` on the session cookie |
| Session expiration | ✅ | JWT `maxAge` set; re-issued on activity |
| Rate limiting (login, API) | ⬜ Phase 2 | Redis-backed, introduced alongside background jobs |
| MFA | 🔜 schema ready | `User.mfaEnabled`/`mfaSecret` exist; TOTP enrollment UI is a Phase 1 stretch item |
| Webhook signature validation (inbound provider webhooks) | ⬜ blocked on a real provider | No route exists yet to validate — Phase 5's SMS/voice/email are all mock-provider today (see docs/06-integrations.md), so there's no real webhook to secure. Ships alongside the first real telephony/email provider, which itself REQUIRES THIRD-PARTY CREDENTIALS |
| Webhook signing (outbound) | ✅ | `Webhook.secret` HMAC-SHA256-signs every outbound payload (`X-FineLine-Signature` header) — `src/lib/modules/webhooks/service.ts` |
| Encrypted secrets at rest | 🔜 platform-dependent | No secret is stored in the database in plaintext; provider API keys live only in env vars / platform secret manager |
| API authentication for `/api/*` routes | 🔜 blocked on a real provider | Session-based for browser calls; API-key auth added when an external integration endpoint actually exists |
| Cron endpoint authentication (`POST /api/cron/campaign-tick`) | ✅ | Requires `CRON_SECRET` as `Authorization: Bearer <secret>`; refuses every request (503) if `CRON_SECRET` is unset — never runs unauthenticated, never runs by accident |
| Document upload validation | ✅ | 4MB size cap (Vercel request-body limit; photos go in linked folders), storage keys sanitized to block path traversal (`src/lib/storage.ts`), every read/write re-checks `organizationId` ownership. No malware/content scanning — out of scope until a real requirement or provider (e.g. an S3 + ClamAV pipeline) exists |
| Document access authorization | ✅ | `/api/documents/[id]` requires `documents:view` (preview) or `documents:download` and re-verifies the document belongs to the caller's organization before streaming any bytes |
| Audit logging | ✅ (auth events) | Expands per-module as each phase ships |
| Least-privilege DB role in production | ⬜ Phase 2 | App connects as a role without `SUPERUSER`/`CREATEDB`; migrations run under a separate elevated role in CI/CD, not the runtime role |
| Dependency vulnerability scanning | ⬜ ongoing | `npm audit` in CI; currently 1 known high-severity transitive advisory (`deepmerge-ts` via `prisma@7.9.1`'s config loader) — tracked, low real-world impact (requires attacker control of local Prisma config merging, not reachable at runtime), revisit on next Prisma patch |
| Secrets never in client bundle | ✅ | Only `NEXT_PUBLIC_*` vars are client-visible; none currently defined |
| No credentials in source control | ✅ | `.env` gitignored; `.env.example` has placeholders only |

## Compliance-specific controls (communications — Phase 5+)

| Control | Status |
|---|---|
| DNC flag blocks outbound calling workflows | ✅ `assertCanCall()` in `src/lib/modules/compliance/service.ts`, enforced inside `logCall()` before the telephony adapter is ever called — not just hidden UI |
| SMS opt-out (STOP keyword) blocks further automated SMS | ✅ `assertCanSms()` enforced inside `sendSms()`. Real inbound STOP handling waits on a real provider webhook (Phase 5 REQUIRES THIRD-PARTY CREDENTIALS); the manual "simulate inbound" path already auto-sets `smsOptedOut` on a literal "STOP" body so the same code path a real webhook will call is exercised today |
| Email unsubscribe honored | ✅ `assertCanEmail()` enforced inside `sendEmail()` |
| Quiet hours / business hours respected by campaigns | ✅ Phase 6 — `Campaign.respectQuietHours` (SMS, 8am–9pm org-local) / `respectBusinessHours` (call/voicemail/mail tasks, Mon–Fri 8am–6pm org-local), enforced in `processDueCampaignEnrollments()` |
| All consent/opt-out changes are audited | ✅ `ComplianceEvent` row + `AuditLog` row on every DNC/opt-out/unsubscribe toggle |

## Threat-model notes specific to this domain

- **PII sensitivity**: homeowner names, addresses, phone numbers, financial distress indicators
  (foreclosure/probate/tax-surplus status) are all sensitive. Treat property/contact export and
  document-download permissions (`leads:export`, `documents:download`) as high-risk grants —
  default them narrowly per the RBAC matrix.
- **Seed data**: never commit real homeowner PII into `prisma/seed.ts` or fixtures — fictional data
  only (source spec §34).
- **Recording/consent**: call recording (Phase 5) must respect one-party/two-party consent law by
  jurisdiction before recording is enabled for a given number — tracked as a Phase 5 requirement,
  not implemented yet.
- **AI prompt injection (Phase 8)**: lead scoring and conversation summaries send org data (notes,
  message bodies, tags) into the model's user-turn content, never its system prompt, and the model
  is asked to return a narrow, structurally-checked shape (a JSON score object or a short summary
  string) — a seller's note containing adversarial text can influence what it says about that one
  lead, but it cannot escalate to executing actions, since AI output is never consumed by anything
  but a human reading the result. `ANTHROPIC_API_KEY` is a standard server-only secret (never sent
  to the client, same handling as every other provider credential).
