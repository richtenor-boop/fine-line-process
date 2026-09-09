# Fine Line Process — MVP Implementation Plan

Phases mirror the source spec exactly (§31). Each phase ends with a working, demoable slice —
never a half-wired feature. "Done" for a phase means the [Definition of Done](#definition-of-done)
below is met for everything shipped in it.

| Phase | Scope | Primary new tables wired | Status |
|---|---|---|---|
| **1** | Auth, Organizations, Users, Roles, Database, Dashboard shell | Organization, User, Role, Permission, RolePermission, Team, TeamMember, AuditLog | **Done** |
| **2** | Contacts, Leads, Properties, Notes, Tags, Custom Fields | Contact, PhoneNumber, EmailAddress, MailingAddress, Property, PropertyOwner, Lead, Tag, TagAssignment, CustomFieldDefinition/Value | **Done** |
| **3** | Pipelines, Stages, Tasks, Activity Timeline | Pipeline, PipelineStage, LeadStageHistory, Task, Appointment | **Done** |
| **4** | CSV Import, Filtering, Search, Duplicate Detection | (uses Phase 2 tables) | **Done** |
| **5** | Communications Architecture, Inbox, SMS/Email Provider Interfaces | Conversation, Call, SmsMessage, Email, ComplianceEvent | **Done** |
| **6** | Campaigns, Automations, Notifications | Campaign, CampaignStep, CampaignEnrollment, Automation, AutomationStep, Webhook, Notification | **Done** |
| **7** | Deals, Buyers, Documents, Calendar | Buyer, Offer, Contract, Deal, Vendor, MarketingCost, Transaction, Document | **Done** |
| **8** | Reporting, KPIs, AI | (aggregations over existing tables) + AI service layer | **Done** |
| **9** | Specialized Foreclosure/Probate/Surplus/Short-Sale modules | Foreclosure, TaxSale, TaxSurplusClaim, MortgageSurplusClaim, ProbateCase, ShortSale, Lien, Mortgage, Auction, CreativeFinanceDeal, PropertyValuation, ComparableSale, RepairEstimate | **Done** |

## Phase 1 — detailed breakdown

1. **Database**: full schema (all phases modeled — see ERD) migrated to a running Postgres instance.
2. **Auth**: Auth.js Credentials provider, bcrypt password hashing, JWT session carrying
   `userId`/`organizationId`/`roleId`. `/login`, `/register` (creates Organization + Owner User in
   one transaction + seeds system roles/permissions for that org).
3. **Organizations**: single-tenant-per-user in MVP (a user belongs to exactly one org); org
   profile editable at `/settings/organization`.
4. **Users**: invite (creates an INVITED user + emails a claim link — email sending is MOCKED
   until Phase 5's provider interfaces exist, so in dev the invite link is logged/shown in-app
   instead of emailed), list/deactivate/change-role at `/settings/users`.
5. **Roles**: seeded 9 system roles + full permission catalog; `/settings/roles` lets an
   Administrator toggle grants per role.
6. **Dashboard shell**: authenticated layout with left nav (permission-filtered, all Phase 2+ nav
   items visible but their pages render a "Planned — Phase N" placeholder until that phase ships),
   top bar, and a `/dashboard` page with placeholder KPI tiles wired to real (currently trivial)
   counts (e.g. "Users: 3", "Organizations: 1") to prove the data layer end-to-end.
7. **Audit log**: every auth event (login, logout, failed login, user created/deactivated, role
   permission change) writes an `AuditLog` row; `/settings/audit-log` lists them.

## Phase 2 — detailed breakdown

1. **Contacts**: no standalone page (matches the sitemap/source nav, which has no top-level
   "Contacts" item) — created inline wherever a Lead or Property needs one. `ContactPicker`
   (`src/components/domain/contact-picker.tsx`) toggles between searching an existing contact
   (`searchContactsAction`, a lightweight name/email/phone lookup — not the Phase 4 duplicate-
   detection pipeline) and creating a new one. Every "new" choice always creates a fresh Contact;
   Phase 4 adds real duplicate detection on import.
2. **Properties**: `/properties` (list, basic state/city/type filters in the service layer),
   `/properties/new` (address + optional inline/searched owner), `/properties/[id]` (details,
   owners with add/remove, notes, custom fields). `estimatedEquity` is computed server-side from
   `estimatedValue - mortgageBalance` when both are present.
3. **Leads**: `/leads` (list), `/leads/new` (combines `ContactPicker` for the seller and
   `PropertyPicker` — same existing/new/none pattern, plus "none" — for the property, so the whole
   "I have a seller lead on a property" flow is one screen), `/leads/[id]` (contact info, editable
   lead details, tags, custom fields, notes, stage-history log). Every org gets a default 9-stage
   pipeline at registration time (`registerOrganization` — previously only `prisma/seed.ts` did
   this, which meant real self-serve signups couldn't create a lead; fixed as part of this phase)
   so Lead creation never depends on a manual seeding step.
4. **Pipeline stage / assignment**: a plain dropdown + "Update stage" button on the Lead detail
   page, backed by the same `LeadStageHistory` audit trail the future Kanban board will read from.
   The drag-and-drop board itself, custom pipeline management, and Tasks/Appointments are Phase 3.
5. **Notes**: polymorphic (lead or property), reusable `NotesSection` component, author + timestamp
   shown, newest first.
6. **Tags**: reusable `TagsSection` on Lead detail (type-to-create-or-reuse, remove via chip),
   `/settings/tags` for org-wide list/create/delete with usage counts.
7. **Custom Fields**: `/settings/custom-fields` lets an admin define TEXT/NUMBER/DATE/BOOLEAN/
   SELECT fields for the Lead or Property entities (Contact and Deal are modeled in the schema —
   `CustomFieldValue` now has `leadId`/`contactId`/`propertyId`/`dealId` — but have no UI to fill
   values yet, so they're intentionally not offered in the "applies to" picker). Reusable
   `CustomFieldsSection` renders and saves values inline on both detail pages.

## Phase 3 — detailed breakdown

1. **Pipeline management** (`/settings/pipelines`): create additional pipelines from a template —
   `PIPELINE_TEMPLATES` (`src/lib/modules/pipelines/templates.ts`) has the exact stage lists from
   source spec §5/§6/§16 for General, Pre-Foreclosure, Tax Surplus, Probate, Short Sale, and
   Dispositions — or start blank. Add/rename/reorder/delete stages (delete is blocked while a
   stage still holds leads), set which pipeline is the org's default. The org's default pipeline
   (created at registration) now sources its stage list from this same template, so there's one
   place that defines "General" instead of two drifting copies.
2. **Kanban board** (`/pipeline`, `/pipeline/[pipelineId]`): columns per stage, native HTML5
   drag-and-drop (no DnD library — kept the dependency footprint down) with optimistic UI update
   on drop, calling the same `changeLeadStage` service Phase 2's dropdown uses, so every stage
   move is written to `LeadStageHistory` regardless of which control triggered it. A pipeline
   switcher tabs between all of the org's pipelines.
3. **Tasks** (`/tasks`, `/tasks/new`): full CRUD, `TaskPriority`/`TaskStatus`, optional lead or
   property link, optional assignee. `/tasks` offers the six views from source spec §7 (My Tasks,
   Team Tasks, Overdue, Today, This Week, Completed) as tabs over one `listTasks(view, ...)`
   service call. Reusable `TaskList`/`QuickTaskForm` components also appear inline on Lead and
   Property detail pages. Task "Comments" reuse the existing `Note` model (added `Note.taskId`)
   rather than a new comment system; task "Attachments" wait for Phase 7's Document upload UI to
   exist — attaching files to something with no upload path yet would be a dead field.
4. **Appointments**: schedulable from a Lead's detail page (type, start/end, location, notes) —
   no standalone `/calendar` yet (that's the full Phase 7 module); this just gives Phase 3's
   activity timeline something to show for "Appointment Set" stages and satisfies the Task
   fields' "Reminder"-adjacent scheduling need for now.
5. **Activity timeline**: `getLeadActivityTimeline` merges stage changes, notes, task
   created/completed events, and appointment-scheduled events into one chronological feed on the
   Lead detail page, replacing Phase 2's bare stage-history list. Calls/texts/emails (Phase 5),
   offers/documents (Phase 7), and automation runs (Phase 6) join the same feed as those phases
   ship — the merge point doesn't change, only the event sources feeding it.
6. **Dashboard**: KPI tiles for new leads (7d), properties, my open tasks, org-wide overdue tasks,
   and today's appointments are now real counts instead of placeholders; deal/revenue tiles stay
   "—" until Phase 7/8.

## Phase 4 — detailed breakdown

1. **CSV import** (`/leads/import`): a four-step wizard — upload, map columns, preview, import —
   entirely client-side up to the import step (parsed with `papaparse` in the browser; no file
   storage needed since nothing is queued for later, matching Phase 7 owning that concern). Column
   mapping supports a single "Full Name" column (split heuristically on the first space) or
   separate First/Last Name — validated against a real foreclosure-list export during development
   (`Owner Name`, `Phone Number`, `Property Address`, etc. map directly; auction/lien-specific
   columns are correctly left unmapped until Phase 9). Rows import in batches of 50 via
   `importLeadsBatchAction`, so a multi-thousand-row file doesn't hit a single oversized request or
   block the UI; a progress bar tracks batches as they complete. Every row is validated
   independently — one bad row doesn't abort the file — and the results screen lists creates,
   duplicate-skips, and a per-row error report with reasons (source spec §29).
2. **Duplicate detection (import)**: before creating a Contact, checks for an existing org contact
   with a matching email or phone; the user picks "skip" or "import anyway" per import run (not
   per row — keeping the control simple). This is real detect-and-choose behavior, not a
   placeholder. "Merge duplicates" (reconciling two existing records' fields into one) is not
   implemented and remains explicitly out of scope — it's a materially different, riskier
   operation than import-time dedup and isn't needed at this stage.
3. **Duplicate prevention (manual entry)**: unchanged from Phase 2's `ContactPicker` search-to-
   reuse — the practical mechanism for manual entry rather than a separate dedup tool.
4. **Filtering**: `/leads` and `/properties` both gained real filter bars — State, County, City,
   ZIP, Property Type, Equity (minimum), Lead Source, Tags, Assigned User, Motivation (source spec
   §13's list, minus Campaign/Foreclosure/Probate/Tax Sale/Surplus, which wait for Phase 6/9's
   tables to have application code). Plain GET `<form>`s reading `searchParams` — no client
   JavaScript needed for filtering to work.
5. **Universal search** (`/search`): the top bar's search box is now live (also a plain GET form,
   no client JS). Covers source spec §20's People/Phone/Email (via Lead↔Contact) and Property
   Address/Parcel Number categories with partial (`contains`) matching; Leads is a category in its
   own right. Deals and Documents join once those phases exist. Each result category is gated by
   its own view permission rather than blanket session-only access.

## Phase 5 — detailed breakdown

1. **Provider interfaces**: `src/lib/integrations/telephony/` and `src/lib/integrations/email/`
   each define a small `types.ts` interface (`sendSms`/`placeCall`, `sendEmail`), a `mock.ts` that
   logs and returns a realistic result shape, and an `index.ts` factory that would select a real
   provider once one exists (currently always returns mock, with a console warning if a real
   credential env var is set but unused — see docs/06-integrations.md). Application code
   (`src/lib/modules/communications`) only ever imports the factory, never a provider directly, so
   adding Twilio/SendGrid later touches these two files, not every call site.
2. **Compliance module** (`src/lib/modules/compliance`): enforces source spec §30's exact rules —
   DNC blocks outbound calls (not SMS), SMS opt-out blocks SMS (not calls), unsubscribe blocks
   email — via `assertCanCall`/`assertCanSms`/`assertCanEmail`, called from inside the
   communications service functions themselves, not left to the UI to remember. Every toggle
   writes a `ComplianceEvent` plus the standard `AuditLog` entry.
3. **Communications service**: `logCall` (outbound gated + placed through the mock provider;
   inbound always loggable, no provider call needed), `sendSms`, `sendEmail` — each finds-or-creates
   a `Conversation` per (lead, channel) and writes the message/call row. A `logInbound` function
   stands in for a real provider's inbound webhook (which can't exist yet — no public URL, no live
   account); sending the literal body "STOP" through it auto-sets `smsOptedOut`, exercising the
   same compliance code path a real webhook will eventually call.
4. **Inbox** (`/inbox`, `/inbox/[leadId]`): lead-centric, not conversation-ID-centric — a seller's
   calls, texts, and emails all merge into one thread per lead, which is what the person answering
   actually wants to see (source spec §8's "unified inbox" intent). `/inbox/[leadId]` has a tabbed
   compose box (SMS / Email / Log Call / Simulate Inbound) and a compliance panel with DNC/opt-out/
   unsubscribe toggles right next to the number or address they apply to.
5. **Activity timeline integration**: `getLeadActivityTimeline` (Phase 3) now merges in calls,
   SMS, and emails alongside stage changes, notes, tasks, and appointments — fulfilling the note
   left in Phase 3's version of this doc that calls/texts/emails would join in Phase 5.
6. **Integrations status page** (`/settings/integrations`): shows each provider's live MOCKED/LIVE
   status read directly from the same factory functions the app uses to send, so the badge can
   never drift from what's actually happening.

## Phase 6 — detailed breakdown

1. **Notifications**: the `Notification` model existed since Phase 1 but had no application code —
   now wired end-to-end. `src/lib/modules/notifications` + a `NotificationBell` in the top bar
   (unread badge, dropdown fetched on open, mark-read/mark-all-read). Feeds both the Automations
   "Create Notification" action and future phases (task reminders, campaign events) without any
   further schema work.
2. **Automations** (`/automations`): a structured list-builder — pick a trigger, then add an
   ordered sequence of (optional single condition) → action steps — deliberately *not* a
   drag-and-drop visual canvas. Building a real node-graph editor (connections, branching,
   canvas persistence) is a disproportionate UI investment to make inside a phase that also
   ships Campaigns and Notifications; the list builder configures the exact same trigger →
   condition → action model with a fraction of the surface area, and nothing about the data
   model (`Automation`/`AutomationStep`) would need to change if a canvas were built later.
   - **Triggers wired**: Lead Created, Lead Updated, Stage Changed, Tag Added, SMS Received,
     Email Received, Appointment Scheduled, Task Completed — the subset of source spec §11's
     trigger list that fires off mutations that actually exist. Form Submitted (no public forms
     feature), Incoming/Missed Call (no answer/miss detection), Contract Signed (Phase 7), and
     Date Reached (needs a scheduler) are correctly left out of the picker rather than faked; the
     Prisma enum still carries all of them so wiring one later is additive.
   - **Actions wired**: Send SMS, Send Email, Create Task, Assign User, Change Stage, Add Tag,
     Remove Tag, Create Notification, Create Appointment, Start Campaign, Stop Campaign, Send
     Webhook — everything from §11 except Generate AI Summary (Phase 8; AI stays advisory-only
     per §19 regardless).
   - **Conditions**: one predicate per step (motivation / current stage / assigned user / has tag
     / property state / minimum equity), not a boolean expression tree. Covers §11's condition
     list except "Lead Type" (no such field exists in the data model) and "Last Contact Date" (no
     denormalized last-contact timestamp is tracked).
   - **Execution model**: synchronous, inside the same request as the triggering mutation — see
     docs/01-architecture.md §7 for why a background queue turned out not to be needed. A critical
     design constraint: an automation's own actions never call the same service functions that
     fire triggers (e.g. its "Change Stage" action writes the Lead/LeadStageHistory rows directly
     rather than calling `changeLeadStage()`), so one automation's action can never re-fire
     another automation's trigger and loop. A depth guard on `runAutomationsForTrigger` is kept
     anyway as defense-in-depth.
3. **Campaigns** (`/campaigns`): multi-step (SMS/Email/Phone Task/Voicemail/Direct Mail Task),
   day-delay sequences, matching source spec §10's example flow exactly — SMS/Email steps send for
   real (through the Phase 5 mock providers); Phone Task/Voicemail/Direct Mail Task steps create a
   `Task` for a human, since there is no automated way to place a call, leave a voicemail, or mail
   a letter. `respectQuietHours` gates SMS to 8am–9pm in the org's timezone; `respectBusinessHours`
   gates the human-driven channels to Mon–Fri 8am–6pm — both read via `Intl.DateTimeFormat` against
   `Organization.timezone`, no date-timezone library needed. A step that's due but outside its
   window is retried on the next tick rather than skipped or advanced early.
   - **Progression engine**: `processDueCampaignEnrollments()` is a real, tested service function —
     callable on demand (Settings > Campaigns → "Process due steps now") or via
     `POST /api/cron/campaign-tick` (bearer-token protected), which an external scheduler would
     call periodically. This sandbox has no cron infrastructure to configure one against, so full
     autonomy is PLANNED pending that external wiring — but the feature itself is complete and
     fully exercisable today through the manual button, not a stub.
4. **Webhooks** (`/settings/webhooks`): real CRUD, HMAC-SHA256-signed outbound sends, used by the
   Automations "Send Webhook" action — this needed no third-party credentials at all (just a
   destination URL), so unlike SMS/Email/Voice it's IMPLEMENTED, not MOCKED.
5. **Trigger wiring is intentionally excluded from CSV import**: importing 200 leads at once and
   having every one instantly fire "send welcome SMS" automations would be a footgun, not a
   feature — real CRMs typically default bulk-import workflow triggering to off. Manual lead
   creation, stage changes, tag adds, etc. all fire automations normally.

## Phase 7 — detailed breakdown

1. **Object storage** (`src/lib/storage.ts`): a real local-filesystem adapter, not a mock like
   Phase 5's providers — it genuinely reads and writes files, so upload, preview, and download all
   work today with zero credentials. The one thing a real S3-compatible bucket buys over it is
   surviving a redeploy (most hosting platforms' local disk is ephemeral); that's the actual
   REQUIRES-CREDENTIALS gap, not "does it work at all."
2. **Documents**: `DocumentsSection` (upload form + list) is wired into Lead, Property, and Deal
   detail pages, backed by one shared service (`src/lib/modules/documents`). The only Route
   Handler this phase needed is `/api/documents/[id]` — a Server Action can't stream a binary
   download response, so serving bytes is the one legitimate exception to "everything is a Server
   Action." A 20MB cap and sanitized storage keys guard against path traversal; there is no
   malware/content scanning (out of scope until a real need or provider exists).
3. **Buyers** (`/buyers`): criteria (markets, ZIPs, property types, price range, min bedrooms, cash
   buyer status) plus a real matching function (`findMatchingBuyers`) that shows up directly on a
   Property's detail page — source spec §15's "match properties against buyer criteria" isn't a
   future promise, it runs on every property view. Markets are free-text (not a controlled list),
   matched loosely against the property's city/state so "Atlanta" or "GA" both work.
4. **Offers → Contracts → Deals**: modeled as a strict progression enforced in the service layer,
   not just the UI — `createContract()` refuses a non-accepted offer, `createDeal()` refuses a
   non-signed contract (both throw, covered by tests). Offers and Contracts are embedded directly
   in a Lead's detail page (`DealSection`) rather than getting their own routes, since they're
   short-lived sub-objects of the lead-to-deal pipeline; a Deal gets a dedicated `/deals/[id]` page
   because it's the longer-lived record spanning acquisition through disposition, with its own
   stage (source spec §16's Dispositions pipeline is `DealStage`'s
   `DISPOSITIONS_AVAILABLE`→`SOLD`... i.e. `CLOSED_WON` progression), buyer assignment, sale
   price/assignment fee, and a running Transaction ledger.
5. **Deal list** (`/deals`): grouped by stage as a plain list, not another drag-and-drop board —
   the Phase 3 Kanban board earned its interactivity because moving a *lead* through a pipeline is
   the single most-repeated action in the app; a deal's stage changes far less often, so a select
   dropdown (still tracked, still fires the standard update path) was the right amount of UI for
   this phase rather than building a second board.
6. **Calendar** (`/calendar`): a hand-rolled month grid (no calendar library), merging
   Appointments, Task due dates, and Deal closing dates, with prev/next-month navigation via plain
   `searchParams` links — no client JavaScript required. Auction and court dates join once Phase
   9's Foreclosure/Auction tables have application code; external two-way sync (Google/Microsoft)
   stays a documented future integration.
7. **Universal search extended**: Deals and Documents (source spec §20's full category list) now
   join Leads and Properties in `/search`, completing the categories promised back in Phase 4.

## Phase 8 — detailed breakdown

1. **AI provider layer**: unlike Phase 5's telephony/email (mocked, no real implementation
   exists), `src/lib/integrations/ai/anthropic.ts` is a real Claude API client via
   `@anthropic-ai/sdk` — set `ANTHROPIC_API_KEY` and it's live. Unset, `mock.ts`'s deterministic
   rule-based heuristic answers instead (same output shape, no network call, no randomness — the
   same input always scores the same way, which is also what makes it unit-testable without a
   key or a database). The factory (`getAiProvider()`) picks between them exactly like every
   other Phase 5+ integration factory.
2. **Lead Scoring**: the "AI Insights" card on Lead detail — score, motivation label, reasons,
   and a recommended action, formatted to match source spec §19's own worked example exactly
   ("Motivation: High / Reason: .../ Recommended Action: ..."), persisted to the `Lead.aiScore`/
   `aiScoreReason` columns that have existed since Phase 1's schema. A "Re-analyze" button re-runs
   it on demand — nothing runs automatically in the background.
3. **Conversation Summaries**: a button on the Inbox thread page that summarizes the SMS/call/
   email history with a lead into 2-3 sentences. Ephemeral — displayed once, not persisted (there's
   no schema field for it; unlike the automation-triggered summary below, this one has a human
   watching who doesn't need it written down).
4. **"Generate AI Summary" automation action**: source spec §11 lists this as an available
   automation action; it was excluded from Phase 6's picker pending an AI layer to call. Now
   wired — when triggered, it summarizes a lead's recent activity timeline into a `Note` (since an
   automation has no UI to show an ephemeral result to). Attributed to whoever configured the
   automation (falling back to the lead's assignee), since `Note.authorUserId` is a real foreign
   key, not a "system" sentinel — the same constraint that shaped `SmsMessage`/`Email.sentByUserId`
   back in Phase 5.
5. **AI stays advisory everywhere**: no automation condition or trigger ever reads an AI result,
   and no action is taken without a human clicking something first — source spec §19's rule holds
   exactly as it has since it was first written into this plan in Phase 1.
6. **Reports** (`/reports`, `/reports/[reportKey]`): nine report types — Leads by Source/Market/
   User, Appointments, Offers, Contracts, Closed Deals, Conversion Rates, and Financials — each
   with its own plain-GET-form date-range filter (no client JS). Conversion Rates is an honest
   period-based volume ratio (leads created in the range vs. appointments/offers/contracts/closes
   created in the same range), not strict per-lead lineage tracking — a lead created near the end
   of a range might convert after it ends, and the report doesn't claim otherwise.
7. **Marketing spend, finally wired**: `MarketingCost` has existed in the schema since Phase 1
   with zero application code behind it. The Financials report now has a real ledger (log/remove
   spend, scoped to a campaign or general) feeding Cost per Lead/Contract/Deal, Revenue, Profit
   (from the Phase 7 `Transaction` ledger — `DISPOSITION_PROCEEDS`/`ASSIGNMENT_FEE` as revenue,
   `ACQUISITION_COST`/`REPAIR_COST`/`CLOSING_COST` plus marketing spend as costs), and Pipeline
   Value (sum of `purchasePrice` across all non-closed Deals — an as-of-now snapshot, not scoped
   to the date range, since "what's currently in the pipeline" isn't a period metric).
8. **Dashboard KPIs completed**: "Deals under contract" and "Pipeline value" were the two tiles
   still showing "—" since Phase 1; both are now real counts/sums, and the same
   `getActivePipelineValue()`/`countDealsUnderContract()` functions back both the dashboard tile
   and the Financials report so the two numbers can never drift apart from showing the same thing
   two different ways.

## Phase 9 — detailed breakdown

1. **Scope decision**: all 13 models had sat in the schema since Phase 1 with zero application
   code — they were fully designed up front because they're all Property-scoped and interrelated,
   but building 13 separate route-based CRUD screens would have been 13 tiny, mostly-identical
   features. Instead, one cohesive module (`src/lib/modules/property-details/`) covers all 13, and
   the UI is two new collapsible sections added to the existing Property detail page
   (`/properties/[id]`) rather than new routes or nav items — the same pattern already used there
   for Documents/Notes/Tasks.
2. **Case-status entities** (Foreclosure, TaxSale, ProbateCase, ShortSale, CreativeFinanceDeal):
   each is 1:1 with a Property (`@unique` on `propertyId`) — a property either has an open case of
   that type or it doesn't — so each gets its own explicitly-typed `upsert*()` service function
   (not one generic/abstracted upsert), matching the "no premature abstraction" rule. `TaxSale`
   nests `TaxSurplusClaim` rows (1:many, a tax sale can generate several surplus claims over time).
3. **List entities** (Lien, Mortgage, Auction, PropertyValuation, ComparableSale, RepairEstimate,
   plus MortgageSurplusClaim which is 1:many directly on Property): straightforward
   create/list/delete functions, each scoped to `organizationId` and verified against the owning
   Property's org before every write — same tenant-isolation pattern as every other module.
4. **RBAC**: reuses the existing `properties:view` (read) / `properties:edit` (all mutations)
   permissions — no new permission keys, since this is Property data, not a new entity type with
   its own access model.
5. **UI**: two `<Card>`s — "Specialized case status" (the 5 upsert-style entities, each in a
   `<details>` panel that defaults open when a record already exists) and "Financial & market
   data" (the 8 list-style entities, each in a `<details>` panel showing existing rows plus an
   inline add form) — collapsible sections instead of 13 always-expanded blocks, kept off the
   critical path for properties that don't need this data.
6. **Deliberately not wired**: these specialized records do **not** auto-sync with the Phase 3
   specialized pipeline templates (Pre-Foreclosure/Tax Surplus/Probate/Short Sale stage sets). A
   Lead moving into a "Pre-Foreclosure" pipeline stage does not create a `Foreclosure` row, and
   vice versa. Conflating "specialized data modules" (this phase) with "pipeline auto-assignment
   workflow logic" (a materially different feature — deciding *when* and *whether* to create a
   case record from a stage change) was an explicit scope boundary, not an oversight.
7. **Auctions and the Calendar**: Phase 7's Calendar (Appointments, Task due dates, Deal closing
   dates) now also plots `Auction.auctionDate`, linking back to the property. `Foreclosure.
   auctionDate` is deliberately not plotted as a second event — it's the same real-world date as
   the `Auction` row created for that property once one exists, so showing both would double-plot
   it. Court dates (a probate hearing, a short-sale lender deadline) remain PLANNED — no model
   carries a dated "court date" field today, so that would need a schema addition, not just a
   query change.
8. **Property list filtering**: `/properties` gained a "case type" filter (Foreclosure/Tax Sale/
   Probate/Short Sale) alongside the Phase 4 filters, plus a case badge column on each row —
   closing the gap the Phase 4 status table had left open ("Filtering — Foreclosure, Probate, Tax
   Sale, Surplus | PLANNED"). Filtering by a specific surplus-claim status, or by Campaign, is
   still not scoped.
9. **Seed data**: fictional demo records only (source spec §34) — a Foreclosure case and a
   Probate case on two of the Phase 2 demo properties, plus a valuation and a repair estimate on a
   third, so the new UI has something to show out of the box.

## First vertical slice (source spec §33) — mapped to phases

| Capability | Ships in |
|---|---|
| Log in | Phase 1 |
| Create users | Phase 1 |
| Create a lead | **Phase 2 — done** |
| Create a property | **Phase 2 — done** |
| Associate owner with property | **Phase 2 — done** |
| Add phone/email | **Phase 2 — done** |
| Add notes | **Phase 2 — done** |
| Assign a lead | **Phase 2 — done** |
| Move lead through pipeline | **Phase 3 — done** (drag-and-drop Kanban board; the Phase 2 dropdown still works too) |
| Create follow-up task | **Phase 3 — done** |
| Filter/search leads | **Phase 4 — done** |
| View activity history | **Phase 3 — done** (merged timeline: stage changes, notes, tasks, appointments; calls/emails/offers/documents/automations join as their phases ship) |
| Import leads through CSV | **Phase 4 — done** |
| View basic dashboard metrics | Phase 1 (shell) / Phase 8 (real KPIs) |

## Definition of Done (applies to every phase)

A feature is not "done" because its screen exists. It's done only when, for that feature:
frontend works; backend works; database persistence works; input validation (Zod) works;
authorization (`requirePermission`) works; error states render; loading states render; tests pass
(unit for services, integration for the Server Action/Route Handler, E2E for the primary flow);
audit-log entries are written where the action is audit-worthy; layout is responsive down to a
reasonable tablet width; no secret/credential is exposed to the client bundle.

## Explicitly deferred out of MVP

Custom (non-system) roles, MFA enrollment UI (schema is ready), org switching for multi-org users,
Postgres RLS hardening (application-layer isolation ships first), any real third-party integration
(all Phase 5+ providers ship against the mock adapter until credentials exist — see
[06-integrations.md](06-integrations.md)).
