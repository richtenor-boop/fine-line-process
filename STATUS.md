# Fine Line Process — Build Status

Kept current as phases ship. Four states only, per the project's development-process rule: never
represent a mocked or planned capability as operational.

- **IMPLEMENTED** — real, working, tested.
- **MOCKED** — a working interface exists and the app behaves correctly end-to-end against it, but
  it does not talk to a real third party yet.
- **PLANNED** — not built.
- **REQUIRES THIRD-PARTY CREDENTIALS** — code is ready to go live the moment the org supplies real
  credentials for that provider (env vars only, no code change needed).

## Phase 1 — Auth, Organizations, Users, Roles, Database, Dashboard shell

| Capability | Status |
|---|---|
| Database schema (full, all phases) | IMPLEMENTED |
| Register (create org + owner user) | IMPLEMENTED |
| Login / logout | IMPLEMENTED |
| Password hashing | IMPLEMENTED |
| Session management (JWT) | IMPLEMENTED |
| RBAC — 9 seeded roles, permission catalog, enforcement | IMPLEMENTED |
| User invite / manage / deactivate | IMPLEMENTED |
| Team management | IMPLEMENTED |
| Dashboard shell + nav | IMPLEMENTED |
| Audit log (auth + user-management events) | IMPLEMENTED |
| MFA enrollment | PLANNED (schema ready) |
| Password reset via email | PLANNED — the flow itself (token generation, reset page) isn't built yet; it could now send through the Phase 5 mock email provider once it is |

## Phase 2 — Contacts, Leads, Properties, Notes, Tags, Custom Fields

| Capability | Status |
|---|---|
| Contacts (create inline via Lead/Property forms, search-to-reuse) | IMPLEMENTED |
| Properties (create, list, detail, owners) | IMPLEMENTED |
| Leads (create with inline/existing contact + property, list, detail) | IMPLEMENTED |
| Pipeline stage assignment (dropdown + history) | IMPLEMENTED |
| Lead assignment | IMPLEMENTED |
| Notes (on leads and properties) | IMPLEMENTED |
| Tags (create, assign/remove on leads, org-wide management) | IMPLEMENTED |
| Custom fields (Lead and Property entities) | IMPLEMENTED — Contact and Deal entities are modeled but have no UI yet (Contact has no dedicated page; Deal ships Phase 7) |
| Duplicate detection on contact/property creation | PLANNED — Phase 4; Phase 2 always creates new unless the user explicitly picks a search result |

## Phase 3 — Pipelines, Stages, Tasks, Activity Timeline

| Capability | Status |
|---|---|
| Pipeline management (create from template or blank, add/rename/reorder/delete stages, set default) | IMPLEMENTED |
| Pipeline stage templates (General, Pre-Foreclosure, Tax Surplus, Probate, Short Sale, Dispositions) | IMPLEMENTED |
| Kanban board with drag-and-drop stage moves | IMPLEMENTED |
| Tasks (create, edit, complete, priority, due date, optional lead/property link and assignee) | IMPLEMENTED |
| Task views (My Tasks, Team Tasks, Overdue, Today, This Week, Completed) | IMPLEMENTED |
| Task comments | IMPLEMENTED — reuses the Note model rather than a separate comment system |
| Task attachments | PLANNED — Phase 7, once Document upload exists |
| Task reminders/notifications | PLANNED — Phase 6, once Notifications are wired |
| Appointments (schedule/cancel from a Lead) | IMPLEMENTED — no standalone Calendar UI yet (Phase 7) |
| Activity timeline (stage changes, notes, tasks, appointments merged) | IMPLEMENTED — calls/emails (Phase 5), offers/documents (Phase 7), automations (Phase 6) join later |
| Dashboard KPIs (new leads, properties, my tasks, overdue tasks, appointments today) | IMPLEMENTED |

## Phase 4 — CSV Import, Filtering, Search, Duplicate Detection

| Capability | Status |
|---|---|
| CSV import wizard (upload, map columns, preview, batched import, per-row error report) | IMPLEMENTED |
| Duplicate detection + skip/create-anyway choice on import | IMPLEMENTED |
| Duplicate merging (reconciling two existing records) | PLANNED — not currently scoped; import-time dedup + manual search-to-reuse cover the practical need |
| Lead filtering (state, county, city, zip, property type, min equity, source, tags, assignee, motivation) | IMPLEMENTED |
| Property filtering (state, county, city, zip, property type, min equity, case type) | IMPLEMENTED — case-type filter (Foreclosure/Tax Sale/Probate/Short Sale) added in Phase 9 once those tables had application code; the properties list also shows a case badge per row |
| Universal search (leads, contacts via leads, properties) | IMPLEMENTED |
| Search — Deals, Documents | PLANNED — Phase 7 |
| Filtering — Campaign, Tax/Mortgage Surplus (as a distinct facet from Tax Sale) | PLANNED — not added; Tax Sale filtering covers the "SURPLUS_AVAILABLE" status but there's no separate surplus-claim-level filter, and Campaign filtering was never scoped |

## Phase 5 — Communications Architecture, Inbox, SMS/Email Provider Interfaces

| Capability | Status |
|---|---|
| Telephony/email provider interfaces (`src/lib/integrations/{telephony,email}`) | IMPLEMENTED |
| Mock telephony/email providers (log + persist as a real send would, no real network call) | MOCKED |
| Real Twilio/SendGrid providers | PLANNED — REQUIRES THIRD-PARTY CREDENTIALS; factory already falls back to mock automatically when unset |
| Inbox (`/inbox`, `/inbox/[leadId]`) — merged SMS/email/call thread per lead | IMPLEMENTED |
| Send SMS / send email from a lead | IMPLEMENTED (via mock provider) |
| Log a call (outbound gated by compliance, inbound always allowed) with disposition | IMPLEMENTED |
| "Simulate inbound" — manual stand-in for a real provider webhook, including STOP-keyword auto-opt-out | IMPLEMENTED — explicitly labeled as a manual test aid, never presented as a real inbound channel |
| Real inbound webhooks (provider → app) | PLANNED — blocked on a real provider existing; see security checklist |
| Compliance: DNC blocks calls, SMS opt-out blocks SMS, unsubscribe blocks email | IMPLEMENTED — enforced in the service layer, not just UI |
| Compliance audit trail (`ComplianceEvent` + `AuditLog`) | IMPLEMENTED |
| Call recording / transcription | PLANNED — Phase 5 requirement, waits on a real telephony provider |
| Quiet hours / business hours enforcement | IMPLEMENTED — Phase 6, via Campaigns (see below) |
| Activity timeline now includes calls/SMS/emails | IMPLEMENTED |

## Phase 6 — Campaigns, Automations, Notifications

| Capability | Status |
|---|---|
| Notifications (bell, unread count, mark read/all read) | IMPLEMENTED |
| Automations — trigger + condition + action step builder | IMPLEMENTED — list-based builder, not a drag-and-drop visual canvas (deliberate scope decision, see docs/05-mvp-plan.md) |
| Automation triggers: Lead Created/Updated, Stage Changed, Tag Added, SMS/Email Received, Appointment Scheduled, Task Completed | IMPLEMENTED |
| Automation triggers: Incoming/Missed Call, Date Reached | PLANNED — each blocked on infrastructure that doesn't exist yet (call-answer detection, a scheduler); Form Submitted shipped in Phase 10 |
| Automation trigger: Contract Signed | IMPLEMENTED — added in Phase 7 once Contracts existed |
| Automation actions: Send SMS/Email, Create Task, Assign User, Change Stage, Add/Remove Tag, Create Notification, Create Appointment, Start/Stop Campaign, Send Webhook | IMPLEMENTED |
| Automation action: Generate AI Summary | PLANNED — Phase 8 |
| Automation conditions | IMPLEMENTED — single predicate per step, not a boolean expression tree |
| Campaigns — multi-step, multi-channel (SMS/Email/Phone Task/Voicemail/Direct Mail) | IMPLEMENTED |
| Campaign progression engine (day-delay steps, quiet/business hours) | IMPLEMENTED — real logic, fully testable today via Settings > Campaigns' manual "Process now" button |
| Automatic scheduled progression | PLANNED — requires configuring an external scheduler to call `POST /api/cron/campaign-tick`; this sandbox has no cron infrastructure of its own (same category of gap as Phase 7 needing a real S3 bucket) |
| Campaign enrollment from a Lead | IMPLEMENTED |
| Webhooks (outbound, HMAC-signed) | IMPLEMENTED — needed no third-party credentials |
| Trigger firing during CSV import | Deliberately NOT wired — see docs/05-mvp-plan.md for why |

## Phase 7 — Deals, Buyers, Documents, Calendar

| Capability | Status |
|---|---|
| Object storage — local filesystem adapter | IMPLEMENTED — real reads/writes, not mocked; the only gap is surviving a redeploy on ephemeral hosting disk |
| Object storage — S3 | PLANNED — REQUIRES THIRD-PARTY CREDENTIALS; factory already falls back to local automatically when unset |
| Document upload/preview/download/delete | IMPLEMENTED — wired into Lead, Property, and Deal detail pages |
| Document malware/content scanning | PLANNED — no requirement or provider selected yet |
| Buyers — CRUD, criteria | IMPLEMENTED |
| Buyer-to-property matching | IMPLEMENTED — runs live on every Property detail page, not a future promise |
| Offers (create, status progression) | IMPLEMENTED |
| Contracts (create from accepted offer, status progression) | IMPLEMENTED — service layer refuses a contract from a non-accepted offer |
| Deals (create from signed contract, stage, buyer assignment, sale price/assignment fee, transaction ledger) | IMPLEMENTED — service layer refuses a deal from a non-signed contract |
| Deal list grouped by stage | IMPLEMENTED — plain grouped list, not a second drag-and-drop board (deliberate scope decision, see docs/05-mvp-plan.md) |
| Calendar — Appointments, Task due dates, Deal closing dates | IMPLEMENTED — hand-rolled month grid, no calendar library |
| Calendar — Auction/court dates | PLANNED — Phase 9, once those tables have application code |
| Calendar — external two-way sync (Google/Microsoft) | PLANNED — documented future integration |
| Universal search — Deals, Documents | IMPLEMENTED — completes the category list promised in Phase 4 |

## Phase 8 — Reporting, KPIs, AI

| Capability | Status |
|---|---|
| AI provider — real Claude API client | IMPLEMENTED — the one integration with an actual real implementation behind it, not just documented; activates automatically when `ANTHROPIC_API_KEY` is set |
| AI provider — deterministic mock fallback | IMPLEMENTED — rule-based heuristic, same output shape, unit-tested without a key or database |
| Lead Scoring ("AI Insights" card, `Lead.aiScore`/`aiScoreReason`) | IMPLEMENTED |
| Conversation Summaries (Inbox thread) | IMPLEMENTED — ephemeral, not persisted |
| Automation action: Generate AI Summary | IMPLEMENTED — writes a Note; closes the last gap in Phase 6's automation action list |
| AI: Missing Information Detection, Task Suggestions, Seller Objection Summaries, Pipeline Risk Detection, Offer Analysis | PLANNED — narrower §19 capabilities not built this phase |
| Reports — Leads by Source/Market/User, Appointments, Offers, Contracts, Closed Deals, Conversion Rates, Financials | IMPLEMENTED — all 9, each with date-range filtering |
| Marketing spend ledger (`MarketingCost`) | IMPLEMENTED — existed in the schema since Phase 1 with no application code until now |
| Dashboard KPIs — Deals under contract, Pipeline value | IMPLEMENTED — the two tiles that showed "—" since Phase 1 are now real |

## Phase 9 — Specialized Real Estate Data (Foreclosure, Probate, Tax/Mortgage Surplus, Short Sale, Creative Finance, Liens, Mortgages, Auctions, Valuations, Comps, Repair Estimates)

| Capability | Status |
|---|---|
| Foreclosure case (status, default amount, auction date, trustee, case number) | IMPLEMENTED — one per property (`@unique` on `propertyId`), upsert semantics |
| Tax sale case (status, sale date/amount, overbid amount) | IMPLEMENTED — one per property |
| Tax surplus claims (nested under a tax sale, status, surplus amount) | IMPLEMENTED — many per tax sale, create/delete |
| Mortgage surplus claims (status, surplus amount) | IMPLEMENTED — many per property, create/delete |
| Probate case (status, case number, county, filed date, personal representative) | IMPLEMENTED — one per property |
| Short sale case (status, lender, loan number) | IMPLEMENTED — one per property |
| Creative finance deal (structure type, terms, monthly payment) | IMPLEMENTED — one per property |
| Liens (holder, amount, filed date, type) | IMPLEMENTED — create/delete list |
| Mortgages (lender, original amount, current balance, origination date) | IMPLEMENTED — create/delete list |
| Auctions (date, location, opening bid, result) | IMPLEMENTED — create/delete list |
| Property valuations (source, value, as-of date) | IMPLEMENTED — create/delete list |
| Comparable sales (address, sold price/date, distance, sqft) | IMPLEMENTED — create/delete list |
| Repair estimates (category, cost, notes) | IMPLEMENTED — create/delete list |
| UI | IMPLEMENTED — consolidated into two new collapsible sections on the existing Property detail page (`/properties/[id]`); no new routes or nav items, mirroring how Documents/Notes/Tasks are already embedded there |
| RBAC | IMPLEMENTED — reuses `properties:view`/`properties:edit`, no new permission keys |
| Auto-sync with the Phase 3 specialized pipelines (Pre-Foreclosure/Tax Surplus/Probate/Short Sale stage templates) | Deliberately NOT wired — these are independent data; conflating "specialized data modules" with "pipeline auto-assignment workflow logic" was an explicit scope boundary, see docs/05-mvp-plan.md |
| Calendar — Auction dates | IMPLEMENTED — `Auction.auctionDate` now plots on the Phase 7 Calendar (`/calendar`) alongside appointments/tasks/closings, linking to the property |
| Calendar — Court dates | PLANNED — no dated "court date" field exists on `ProbateCase`/`ShortSale`/`Foreclosure` today (they carry filed/default/auction dates, not hearing dates); would need a schema addition, not just a query change |
| Property list — case-type filter + badge (`/properties`) | IMPLEMENTED — filter by Foreclosure/Tax Sale/Probate/Short Sale, plus a case badge column on each row |

## Phase 10 — Deal Analyzer, Lead Capture Forms, Speed to Lead

Gap analysis against leading investor CRMs (REsimpli, DealMachine, Left Main, InvestorFuse): the
three most-cited capabilities that need no paid data provider.

| Capability | Status |
|---|---|
| Deal Analyzer on every Property page — MAO (70% rule, adjustable), wholesale offer, offer-vs-MAO spread, flip profit/ROI, rental cash flow, cap rate, 1% rule | IMPLEMENTED — live recalculation as you type; one saved worksheet per property (`DealAnalysis`); derived figures computed on read, never stored |
| Deal Analyzer prefill from existing data (property ARV/estimated value, sum of itemized repair estimates) | IMPLEMENTED — suggestions only; nothing is written until the user saves, so no record is overwritten |
| Deal Analyzer financing (loan terms, cash-on-cash with leverage) | PLANNED — all figures assume an all-cash purchase and the UI says so |
| Public lead-capture forms (`/settings/lead-forms` → shareable `/f/<token>` link + iframe embed code) | IMPLEMENTED — mobile-friendly, honeypot spam trap, per-IP hourly rate limit (hashed IP, best-effort) |
| Form submission → lead (contact, property, lead source, assignee) with duplicate protection | IMPLEMENTED — reuses an existing contact by email/phone and attaches repeat submissions to that seller's open lead instead of creating a duplicate; reuses an existing property by address + ZIP |
| Form submission notification + seller message on the Lead page | IMPLEMENTED |
| Automation trigger: Form Submitted | IMPLEMENTED — closes the Phase 6 gap; new leads also fire Lead Created |
| Speed to Lead report (median/average response, % within 5 min / 1 hr, per-assignee, leads waiting on first contact) | IMPLEMENTED — measures the first OUTBOUND call/SMS/email; inbound messages don't count |
| Clickjacking protection (`X-Frame-Options: DENY` / `frame-ancestors 'none'`) | IMPLEMENTED — app-wide; only `/f/*` forms may be framed |
| Skip tracing, list pulling/stacking, driving for dollars, automated valuations (RentCast etc.) | PLANNED — REQUIRES THIRD-PARTY CREDENTIALS and paid usage; not built without an approved provider |

## Third-party integrations

| Integration | Status |
|---|---|
| SMS (Twilio) | MOCKED — REQUIRES THIRD-PARTY CREDENTIALS to go live |
| Voice (Twilio) | MOCKED — REQUIRES THIRD-PARTY CREDENTIALS to go live |
| Email (SendGrid) | MOCKED — REQUIRES THIRD-PARTY CREDENTIALS to go live |
| Object storage (S3-compatible) | Local adapter IMPLEMENTED (real, not mocked) — S3 itself REQUIRES THIRD-PARTY CREDENTIALS |
| Calendar sync (Google/Microsoft) | PLANNED |
| E-signature (DocuSign) | PLANNED |
| Property/contact data enrichment | PLANNED |
| AI assistant (Anthropic) | IMPLEMENTED — real Claude API client, live the moment `ANTHROPIC_API_KEY` is set (no mock/real gap like the others — a deterministic heuristic stands in only when the key is absent) |

See [docs/06-integrations.md](docs/06-integrations.md) for what each requires to go live.
