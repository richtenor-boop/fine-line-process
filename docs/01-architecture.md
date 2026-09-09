# Fine Line Process — System Architecture

## 1. Product Summary

Fine Line Process is a multi-tenant real-estate investor CRM and operating system: leads, properties,
pipelines, tasks, communications, campaigns, automations, buyers, deals, documents, and reporting,
purpose-built for acquisitions, foreclosure, probate, tax-surplus, short-sale and dispositions workflows.

## 2. High-Level Architecture

Modular monolith, not microservices. One deployable Next.js application with clearly separated
internal modules. Split into services only if a specific module (e.g. call recording ingestion,
bulk CSV processing) demonstrably needs independent scaling.

```
┌─────────────────────────────────────────────────────────────────┐
│                      Next.js Application                        │
│  ┌───────────────┐  ┌───────────────────┐  ┌──────────────────┐ │
│  │   App Router   │  │   Route Handlers   │  │  Server Actions  │ │
│  │  (RSC pages)   │  │   (/api/*)          │  │  (mutations)     │ │
│  └───────┬───────┘  └──────────┬─────────┘  └────────┬─────────┘ │
│          │                     │                      │           │
│          └─────────────────────┼──────────────────────┘           │
│                                 ▼                                 │
│                     ┌───────────────────────┐                     │
│                     │   Domain Modules       │                     │
│                     │  (lib/modules/*)        │                     │
│                     │  - auth                 │                     │
│                     │  - organizations         │                     │
│                     │  - contacts/leads        │                     │
│                     │  - properties             │                     │
│                     │  - pipelines/tasks        │                     │
│                     │  - communications          │                     │
│                     │  - campaigns/automations   │                     │
│                     │  - buyers/deals/documents   │                     │
│                     │  - reporting/ai              │                     │
│                     └───────────┬───────────────┘                     │
│                                 ▼                                 │
│                     ┌───────────────────────┐                     │
│                     │   Prisma ORM Layer     │                     │
│                     └───────────┬───────────────┘                     │
└─────────────────────────────────┼─────────────────────────────────┘
                                   ▼
                     ┌───────────────────────┐
                     │  PostgreSQL (primary)  │
                     └───────────────────────┘

  Supporting infrastructure (added as phases require it):
  - Redis: session cache, BullMQ background jobs, rate limiting
  - S3-compatible object storage: documents, photos, recordings
  - Background worker process: campaign ticks, automation runs, CSV import processing
  - Provider adapters: SMS/voice/email/e-sign/data-enrichment (behind internal interfaces)
```

## 3. Module Boundaries

Every domain module under `src/lib/modules/<name>` owns:
- Its Prisma models (defined in the shared `schema.prisma`, grouped by comment headers)
- Its server-side service functions (`service.ts`) — the only code allowed to call `prisma` directly for that domain
- Its Zod validation schemas (`schema.ts`)
- Its authorization rules (`policy.ts`) — wraps `lib/rbac`

UI (`src/app/**`) calls modules through Server Actions or Route Handlers only. No direct Prisma
access from React components. This keeps authorization and validation centralized and makes the
eventual extraction of a module into its own service (if ever needed) a bounded-context refactor,
not a rewrite.

## 4. Multi-Tenancy Model

Single database, shared schema, `organizationId` row-level partitioning (see §24 of the source spec).
- Every tenant-owned table has a required `organizationId` foreign key.
- All Prisma queries go through service-layer helpers that inject `organizationId` from the
  authenticated session — application code never trusts a client-supplied org id.
- Postgres Row-Level Security (RLS) is layered on top as defense-in-depth once the app connects
  through a role that sets `app.current_org_id` per request (planned — Phase 1 ships with
  application-layer isolation only; RLS hardening is a Phase 1 stretch/Phase 2 item, tracked in
  the security checklist).

## 5. Authentication & Session

- Auth.js (NextAuth v5) with the Credentials provider (email + password, bcrypt-hashed) for MVP.
- Prisma adapter persists `User`, `Account`, `Session`, `VerificationToken`.
- JWT session strategy carrying `userId`, `organizationId`, `role` claims, re-validated against
  the database on each server action via the RBAC layer (claims are a cache, not a trust boundary).
- MFA-ready: `User.mfaEnabled` / `User.mfaSecret` columns exist in the schema now; TOTP enrollment
  UI is a PLANNED Phase-1-stretch item, not implemented in the first vertical slice.

## 6. Authorization (RBAC)

- Roles are organization-scoped rows (`Role`) with a many-to-many `RolePermission` join to a fixed
  `Permission` catalog (seeded, not user-editable in MVP — custom roles are PLANNED).
- `lib/rbac.ts` exposes `requirePermission(session, "leads:edit")` used at the top of every server
  action / route handler. UI-level hiding of buttons is a UX nicety, never the enforcement point.
- See [04-rbac-matrix.md](04-rbac-matrix.md) for the full matrix.

## 7. Background Jobs

Not introduced yet — revisit only if a real need appears (send retries at real-provider volume,
sub-minute campaign timing). What looked at Phase 1 like an obvious Phase 5 need for a durable
queue turned out not to be one in practice:

- **Event-driven automations** (Phase 6, source spec §11) fire synchronously, in the same request
  as the mutation that triggers them (lead created, stage changed, tag added, etc.) — see
  `runAutomationsForTrigger()` calls in each feature's `actions.ts`. A trigger check plus a
  handful of DB writes comfortably fits inside one request; there is nothing to queue.
- **Campaign step progression** (Phase 6, day-based delays) needs a *scheduled* tick, not a queue —
  `processDueCampaignEnrollments()` is a plain service function, callable on demand (Settings >
  Campaigns' "Process now" button) or via `POST /api/cron/campaign-tick`, which an external
  scheduler (Vercel Cron, a platform cron job) calls periodically. This sandbox has no cron
  infrastructure of its own to configure one against — the same category of gap as Phase 7 needing
  a real S3 bucket — but the processing logic itself is real and fully tested today.

Redis + BullMQ (or equivalent) would become worth the operational cost once a real telephony/email
provider's actual send volume needs retry-with-backoff and rate-limit-aware queuing that a
synchronous request can't absorb — that's a Phase 5-real-provider-driven decision, not a Phase 5
scheduled one.

## 8. File Storage

S3-compatible object storage (AWS S3 or compatible, e.g. Cloudflare R2/MinIO for local dev) behind
a `lib/storage.ts` adapter. Documents/photos store only the object key + metadata in Postgres.
Introduced in Phase 7 (Documents). Local dev can use a MinIO container or local filesystem adapter
so Phase 1–6 never require cloud credentials.

## 9. Third-Party Integration Strategy

Every external capability (SMS, voice, email, e-signature, calendar sync, data enrichment) is
defined as a TypeScript interface in `src/lib/integrations/<capability>/types.ts` with:
- A `mock` implementation (always available, used in dev/test, logs to console/db instead of
  sending) — see [06-integrations.md](06-integrations.md).
- Zero or more real provider implementations, added only when credentials exist and the module's
  phase is reached.
- A factory (`getProvider()`) reading `process.env` to select the implementation.

This lets Phase 5 (Communications) ship a fully working inbox/timeline UI against the mock provider
before any telephony contract exists, and lets a real provider be swapped in later without touching
call sites.

## 10. Environments

- **Development**: local Postgres (Docker or local install), mock integration providers, local
  filesystem storage adapter.
- **Staging**: managed Postgres, real provider sandboxes/test credentials, S3 bucket, seeded demo org.
- **Production**: managed Postgres with connection pooling (PgBouncer or provider-native pooler),
  real providers, S3 bucket, Redis, background worker as a separate container/process from web.

All three are the same container image; behavior is entirely environment-variable driven
(see [07-environment-variables.md](07-environment-variables.md)).

## 11. Repository Structure

See [repository layout](../README.md#repository-structure) in the README for the canonical,
up-to-date file tree — kept next to the code so it doesn't drift from this doc.
