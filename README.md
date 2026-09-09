# Fine Line Process

Real-estate investor CRM and operating system — leads, properties, pipelines, tasks,
communications, campaigns, buyers, deals, documents, and reporting, with dedicated workflows for
foreclosure, probate, tax-surplus, and short-sale acquisitions.

Original codebase, UI, and branding — built to the functional requirements in the project spec,
not copied from any competitor product.

## Status

**Phase 1 (Auth, Organizations, Users, Roles, Database, Dashboard shell) is implemented.**
Everything else is modeled in the database schema but not yet built — see [STATUS.md](STATUS.md)
and [docs/05-mvp-plan.md](docs/05-mvp-plan.md) for the phase-by-phase plan.

## Documentation

| Doc | Covers |
|---|---|
| [docs/01-architecture.md](docs/01-architecture.md) | System architecture, module boundaries, multi-tenancy |
| [docs/02-database-erd.md](docs/02-database-erd.md) | Data model — [`prisma/schema.prisma`](prisma/schema.prisma) is the source of truth |
| [docs/03-sitemap.md](docs/03-sitemap.md) | Application sitemap |
| [docs/04-rbac-matrix.md](docs/04-rbac-matrix.md) | Roles, permissions, and the default grant matrix |
| [docs/05-mvp-plan.md](docs/05-mvp-plan.md) | Phase-by-phase implementation plan |
| [docs/06-integrations.md](docs/06-integrations.md) | Third-party integration requirements |
| [docs/07-environment-variables.md](docs/07-environment-variables.md) | Environment variable spec |
| [docs/08-security-checklist.md](docs/08-security-checklist.md) | Security checklist |
| [docs/09-testing-strategy.md](docs/09-testing-strategy.md) | Testing strategy |

## Getting started

Requires Node 20+ and a PostgreSQL database.

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL and AUTH_SECRET (npx auth secret)
npm run db:migrate     # applies prisma/schema.prisma to your database
npm run db:seed        # optional: creates a demo org + fictional users (see prisma/seed.ts)
npm run dev
```

Then visit `http://localhost:3000` — it redirects to `/register` (no session) to create the first
organization and Owner user, or `/login` if seeded demo credentials are being used (see the
console output of `npm run db:seed` for demo login emails; password is printed there too).

## Commands

```bash
npm run dev             # start the dev server
npm run build            # production build
npm run typecheck        # tsc --noEmit
npm run lint              # eslint
npm run test               # vitest (unit/integration; DB-dependent tests are opt-in, see below)
npm run test:e2e            # playwright (requires the app running against a migrated database)
npm run db:migrate           # create/apply a migration from prisma/schema.prisma
npm run db:studio             # Prisma Studio — browse the database
```

Some integration tests need a real, migrated Postgres and are skipped by default; opt in with
`RUN_DB_TESTS=1 npm run test` once `npm run db:migrate` has been run against a real database — see
[docs/09-testing-strategy.md](docs/09-testing-strategy.md).

## Repository structure

```
fine-line-process/
├── docs/                          # architecture, ERD, sitemap, RBAC, MVP plan, security, testing
├── e2e/                           # Playwright end-to-end tests
├── prisma/
│   ├── schema.prisma              # full data model (all phases) — the ERD source of truth
│   └── seed.ts                    # fictional demo data (dev only)
├── src/
│   ├── app/
│   │   ├── (auth)/                # /login, /register — unauthenticated route group
│   │   ├── (dashboard)/           # authenticated shell — nav, all module routes
│   │   │   ├── dashboard/
│   │   │   ├── leads/ properties/ pipeline/ tasks/ inbox/ campaigns/ automations/
│   │   │   │   calendar/ buyers/ deals/ documents/ reports/    # Phase 2+ (placeholder for now)
│   │   │   └── settings/          # organization, users, roles, teams, audit-log (Phase 1)
│   │   │                          # + pipelines, custom-fields, tags, integrations, webhooks (later phases)
│   │   └── api/auth/[...nextauth]/route.ts
│   ├── components/
│   │   ├── ui/                    # Button, Input, Card, Alert — shared primitives
│   │   └── layout/                # SidebarNav, TopBar, PlannedPage, nav-items data
│   ├── lib/
│   │   ├── modules/                # one folder per domain module: schema.ts (Zod) + service.ts (Prisma)
│   │   │   ├── organizations/ users/ roles/ teams/ audit/
│   │   ├── auth.ts                 # Auth.js (NextAuth v5) config
│   │   ├── auth/password.ts        # bcrypt hashing
│   │   ├── rbac.ts                 # requirePermission() — the authorization enforcement point
│   │   ├── rbac/permissions.ts     # permission catalog + default role grants (source of truth)
│   │   ├── db.ts                   # Prisma client singleton (driver adapter, Prisma 7)
│   │   ├── db/tenant.ts             # tenant-scoping query helper
│   │   ├── audit.ts                 # writeAuditLog()
│   │   ├── env.ts                    # Zod-validated process.env
│   │   └── cn.ts                      # Tailwind class-merge helper
│   └── proxy.ts                        # route protection (Next.js 16 renamed Middleware → Proxy)
├── prisma.config.ts                     # Prisma 7 CLI config (migrations, seed command)
├── vitest.config.ts
├── playwright.config.ts
└── STATUS.md                             # IMPLEMENTED / MOCKED / PLANNED tracker
```

New domain modules (Phase 2+) follow the same `src/lib/modules/<name>/{schema,service}.ts` pattern
established in Phase 1 — see [docs/01-architecture.md](docs/01-architecture.md) §3.
