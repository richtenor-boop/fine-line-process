# Fine Line Process — Environment Variable Specification

Canonical list lives in [`.env.example`](../.env.example). Never commit a real `.env`. Secrets are
injected by the deployment platform (or a local `.env` gitignored) — never hard-coded, never sent
to the client bundle (only `NEXT_PUBLIC_*` vars are client-visible; nothing secret is prefixed that
way).

## Phase 1 — required now

| Variable | Purpose | Required in |
|---|---|---|
| `DATABASE_URL` | Postgres connection string (`postgresql://user:pass@host:5432/db?schema=public`) | dev/staging/prod |
| `AUTH_SECRET` | Auth.js session/JWT signing secret — generate with `npx auth secret` | dev/staging/prod |
| `NEXTAUTH_URL` | Canonical app URL (e.g. `http://localhost:3000`, `https://app.finelineprocess.com`) | staging/prod (optional in dev) |
| `NODE_ENV` | `development` / `test` / `production` | all |

## Phase 5+ — telephony (SMS/voice), only once a provider is selected

| Variable | Purpose |
|---|---|
| `TWILIO_ACCOUNT_SID` | Twilio account identifier |
| `TWILIO_AUTH_TOKEN` | Twilio auth token (or use API Key SID/Secret pair below) |
| `TWILIO_API_KEY_SID` / `TWILIO_API_KEY_SECRET` | Scoped API key alternative to Auth Token |
| `TWILIO_PHONE_NUMBER` | Default sending number (E.164) |
| `TWILIO_WEBHOOK_SIGNING_SECRET` | Used to validate inbound webhook signatures |

## Phase 5+ — email

| Variable | Purpose |
|---|---|
| `SENDGRID_API_KEY` | Transactional email provider key |
| `EMAIL_FROM_ADDRESS` | Default "from" address for outbound mail |

## Phase 7+ — object storage

| Variable | Purpose |
|---|---|
| `S3_BUCKET` | Bucket name |
| `S3_REGION` | Region |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Credentials (omit if using an IAM role) |
| `S3_ENDPOINT` | Override for S3-compatible providers (R2, MinIO); omit for AWS |

## Phase 6+ — background jobs

| Variable | Purpose |
|---|---|
| `REDIS_URL` | BullMQ / rate-limiting backend — still not introduced; Phase 6's automations run synchronously within the triggering request, which has been sufficient so far (see docs/01-architecture.md §7) |
| `CRON_SECRET` | Required for `POST /api/cron/campaign-tick` to accept requests. Point an external scheduler (Vercel Cron, a platform cron job, etc.) at it with `Authorization: Bearer <secret>` to advance campaign enrollments automatically. Without it, the route refuses everything (503) — campaign steps can still be processed on demand via the "Process due steps now" button in Settings > Campaigns |

## Phase 7+ — e-signature

| Variable | Purpose |
|---|---|
| `DOCUSIGN_INTEGRATION_KEY`, `DOCUSIGN_USER_ID`, `DOCUSIGN_ACCOUNT_ID`, `DOCUSIGN_PRIVATE_KEY` | JWT grant auth for DocuSign |

## Phase 8+ — AI

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Lead scoring and conversation summaries call the real Claude API when set; a deterministic mock heuristic answers otherwise — see docs/06-integrations.md |
| `ANTHROPIC_MODEL` | Optional, defaults to `claude-sonnet-5` |

## Rules

- Every variable an integration needs is read only inside `src/lib/integrations/**` or
  `src/lib/**` server-only modules — never in a Client Component, never in a file importable from
  one.
- A missing *optional* (Phase 5+) variable must never crash the app at boot; the integration
  factory falls back to its mock implementation (see [06-integrations.md](06-integrations.md)).
- A missing *required* (Phase 1) variable should fail fast and loud at boot with a clear message —
  see `src/lib/env.ts`, which validates `process.env` against a Zod schema on startup.
