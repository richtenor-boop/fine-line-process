# Fine Line Process — Application Sitemap

Legend: **Ph#** = phase it ships in (see [05-mvp-plan.md](05-mvp-plan.md)). Routes are Next.js App
Router paths under `src/app`. `(auth)` and `(dashboard)` are route groups (no URL segment).

## Public / unauthenticated

| Route | Purpose | Phase |
|---|---|---|
| `/login` | Email + password sign-in | 1 |
| `/register` | Create organization + first (Owner) user | 1 |
| `/forgot-password`, `/reset-password/[token]` | Password reset | 1 (stretch) |

## Authenticated shell

All routes below sit under `(dashboard)/` and share a persistent left-nav + top bar
(`src/app/(dashboard)/layout.tsx`). Every route is organization-scoped and RBAC-checked
server-side before render.

| Nav item | Route | Purpose | Phase |
|---|---|---|---|
| Dashboard | `/dashboard` | KPI tiles, filters, activity feed | 1 (shell) → 8 (full KPIs) |
| Leads | `/leads` | List/filter/search leads | 2 |
| Leads | `/leads/[id]` | Lead detail: info, timeline, tasks, notes | 2 |
| Leads | `/leads/import` | CSV import wizard | 4 |
| Properties | `/properties` | Property list/filter (incl. case-type filter + badge, Phase 9) | 2 |
| Properties | `/properties/[id]` | Property detail, owners, docs, specialized case data (Phase 9) | 2 |
| Pipeline | `/pipeline` | Kanban board (default pipeline) | 3 |
| Pipeline | `/pipeline/[pipelineId]` | Kanban board (specific/specialized pipeline) | 3 |
| Tasks | `/tasks` | My Tasks / Team Tasks / Overdue / Today / This Week views | 3 |
| Inbox | `/inbox` | Unified SMS/Email/Call conversation list, grouped by lead | 5 |
| Inbox | `/inbox/[leadId]` | Merged conversation thread for one lead (all channels) + compose | 5 |
| Campaigns | `/campaigns` | Campaign list | 6 |
| Campaigns | `/campaigns/[id]` | Campaign step builder, enrollment stats | 6 |
| Automations | `/automations` | Automation list | 6 |
| Automations | `/automations/[id]` | Trigger/condition/action builder | 6 |
| Calendar | `/calendar` | Appointments, task due dates, deal closing dates, auction dates (Phase 9; court dates still PLANNED — see STATUS.md) | 7 |
| Buyers | `/buyers` | Buyer list/filter, criteria matching | 7 |
| Deals | `/deals` | Deal list by stage | 7 |
| Deals | `/deals/[id]` | Deal detail: offer, contract, transactions | 7 |
| Documents | `/documents` | Org-wide document search/browse | 7 |
| Reports | `/reports` | Report picker | 8 |
| Reports | `/reports/[reportKey]` | Individual report w/ date-range filter | 8 |
| Settings → Organization | `/settings/organization` | Org profile, timezone | 1 |
| Settings → Users | `/settings/users` | Invite/manage users, assign roles | 1 |
| Settings → Roles | `/settings/roles` | View/edit role permissions | 1 |
| Settings → Teams | `/settings/teams` | Team management | 1 |
| Settings → Pipelines | `/settings/pipelines` | Create/edit pipelines & stages | 3 |
| Settings → Custom Fields | `/settings/custom-fields` | Define custom fields per entity | 2 |
| Settings → Tags | `/settings/tags` | Tag management | 2 |
| Settings → Integrations | `/settings/integrations` | Provider connection status (SMS/email/etc.) | 5+ |
| Settings → Webhooks | `/settings/webhooks` | Outbound webhook management | 6 |
| Settings → Audit Log | `/settings/audit-log` | Searchable audit trail | 1 |
| Search | `/search?q=` | Universal search results | 4 |

## API surface (`/api/*`)

Server Actions power nearly every in-app mutation (not listed here — see each module's
`actions.ts`); Route Handlers exist only where something other than the app's own UI needs to call
in:

| Route | Purpose | Phase |
|---|---|---|
| `/api/auth/[...nextauth]` | Auth.js session endpoints | 1 |
| `/api/cron/campaign-tick` | External-scheduler target for campaign step progression (bearer-token protected via `CRON_SECRET`) | 6 |
| `/api/documents/[id]` | Serves a document's bytes for preview/download (`?download=1` forces attachment) — the one place a binary response is needed, everything else is a Server Action | 7 |
| `/api/webhooks/*` (inbound provider webhooks) | PLANNED — added alongside the first real SMS/voice/email provider; see docs/06-integrations.md | 5 (blocked on credentials) |

CSV import (Phase 4) needed no upload endpoint — parsing happens client-side and mapped rows are
sent to a Server Action in batches; see docs/05-mvp-plan.md Phase 4.

## Global elements (present on every dashboard page)

- Top bar: universal search, notification bell, user menu (profile, org switcher if user belongs
  to >1 org — post-MVP, sign out).
- Left nav: collapsible, permission-filtered (a nav item never renders if the user's role lacks
  the corresponding `*:view` permission).
