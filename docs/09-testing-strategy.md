# Fine Line Process — Testing Strategy

## Tooling

- **Unit / integration**: Vitest + Testing Library (`vitest.config.ts`). Runs against a real test
  Postgres database (via `DATABASE_URL` pointed at a disposable `fine_line_process_test` db, reset
  between test files) for service-layer tests — no mocked Prisma client, so tests catch real
  constraint/relation mistakes.
- **End-to-end**: Playwright (`playwright.config.ts`), runs against a locally built app + seeded
  test org.
- **Static checks**: `tsc --noEmit`, ESLint, `prisma validate`, all run in CI before tests.

## What gets tested per module

| Layer | What's covered | Example |
|---|---|---|
| Validation schemas | Zod schema accepts valid input, rejects invalid (missing required field, wrong type, out-of-range) | `src/lib/modules/leads/schema.test.ts` |
| Service functions | CRUD behavior, tenant isolation (org A cannot read/write org B's rows), soft-delete behavior, cascade behavior | `src/lib/modules/leads/service.test.ts` |
| Authorization | `requirePermission` blocks a role lacking the permission and allows one with it, for every mutating action | `src/lib/rbac.test.ts` + per-module action tests |
| Server Actions / Route Handlers | Full request→response including validation + auth + service call | `src/app/(dashboard)/leads/actions.test.ts` |
| E2E critical paths | See below | `e2e/*.spec.ts` |

## Required test coverage per source spec §35

Authentication, Authorization, Tenant Isolation, Lead CRUD, Property CRUD, Pipeline Movement, Task
Creation, CSV Imports, Duplicate Handling, Search, Filtering, Audit Logging — each gets at least
one integration test exercising the real database once its owning phase ships. Phase 1 ships the
first four now (Authentication, Authorization, Tenant Isolation, and a base audit-logging test for
login/user-management events); the rest are added alongside their phase.

## Primary E2E flow (source spec §35, "create end-to-end tests for the primary lead-management workflow")

Once Phase 3 ships, `e2e/lead-lifecycle.spec.ts` drives: log in → create contact → create property
→ create lead linking them → move lead across pipeline stages → create a follow-up task → add a
note → verify the activity timeline shows every step in order → log out. Phase 1's own E2E test
(`e2e/auth.spec.ts`) covers register → login → see dashboard → log out, as the foundation this
later flow builds on.

## Tenant isolation test pattern

```ts
test("organization B cannot read organization A's leads", async () => {
  const orgA = await createTestOrg();
  const orgB = await createTestOrg();
  const lead = await createTestLead(orgA);

  const result = await leadService.findById(orgB.id, lead.id);
  expect(result).toBeNull(); // never throws with org A's data; returns not-found
});
```

Every service function takes `organizationId` as its first argument specifically so this class of
test is mechanical to write for every module, not just leads.

## CI gate

`npm run typecheck && npm run lint && npm run test && npm run test:e2e` — all must pass before
merge. `prisma migrate deploy --dry-run` (or equivalent) runs against a throwaway database to catch
migration errors before they reach staging.

## Local commands

```bash
npm run test          # vitest, watch mode off
npm run test:watch    # vitest watch mode
npm run test:e2e      # playwright, requires `npm run build && npm run start` or dev server up
npm run typecheck
npm run lint
```
