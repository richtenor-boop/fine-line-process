# Fine Line Process — RBAC Permission Matrix

## Roles

Nine system roles are seeded into every new organization (`prisma/seed.ts`). MVP roles are fixed
(cannot be renamed/deleted); their permission grants **can** be toggled by an Administrator/Owner
on `/settings/roles`. Fully custom (user-created) roles are PLANNED, post-MVP.

| Role | Intended user |
|---|---|
| Owner | Company principal. Full access, only role that can delete the organization or transfer ownership. |
| Administrator | Runs the CRM day-to-day: users, roles, integrations, all data. |
| Manager | Team lead. Full visibility, can assign work and view financials, no system configuration. |
| Acquisitions | Acquisitions reps. Full access to leads/contacts/properties/tasks/deals they work. |
| Lead Manager | Owns lead flow: assignment, campaigns, automations, reporting on lead performance. |
| Researcher | Skip-tracing / data entry. Can view and enrich contacts/properties, cannot delete or message. |
| Dispositions | Manages buyer relationships and the dispositions pipeline. |
| Transaction Coordinator | Manages documents, contracts, and deals through closing. |
| Read Only | Auditors, investors, or new hires in observation — view everything, change nothing. |

## Permission catalog

Enforced server-side in every Server Action / Route Handler via `requirePermission()` in
[`src/lib/rbac.ts`](../src/lib/rbac.ts) — never trust a hidden UI element as the enforcement point.

| Permission key | Description |
|---|---|
| `leads:view` | View lead records |
| `leads:edit` | Create/update leads, change pipeline stage |
| `leads:delete` | Soft-delete leads |
| `leads:export` | Export lead lists to CSV |
| `leads:assign` | Reassign a lead to another user |
| `contacts:view` | View contact records |
| `contacts:edit` | Create/update contacts, phones, emails, addresses |
| `properties:view` | View property records |
| `properties:edit` | Create/update property records |
| `pipelines:manage` | Create/edit pipelines and stages |
| `tasks:view` | View tasks |
| `tasks:edit` | Create/update/complete tasks and appointments |
| `communications:send` | Send SMS / email to a lead |
| `communications:calls_make` | Place outbound calls (click-to-call) |
| `communications:recordings_view` | Listen to / read call recordings & transcripts |
| `campaigns:manage` | Create/edit/start/stop campaigns |
| `automations:manage` | Create/edit/activate automations |
| `documents:view` | View/preview documents |
| `documents:upload` | Upload documents |
| `documents:download` | Download original document files |
| `documents:delete` | Delete documents |
| `deals:view` | View deals, offers, contracts |
| `deals:edit` | Create/update offers, contracts, deals |
| `buyers:view` | View buyer records |
| `buyers:edit` | Create/update buyer records and criteria |
| `financials:view` | View marketing spend, revenue, profit figures |
| `reports:view` | Access the Reports section |
| `users:manage` | Invite/deactivate users, change their role |
| `roles:manage` | Toggle permissions on a role |
| `teams:manage` | Create/edit teams and membership |
| `integrations:manage` | Connect/disconnect third-party providers |
| `webhooks:manage` | Create/edit outbound webhooks |
| `audit_log:view` | View the organization audit log |
| `organization:manage` | Edit org profile, timezone; org-level settings |

## Matrix

✓ = granted by default. Blank = not granted by default (an Administrator can still toggle it).

| Permission | Owner | Admin | Manager | Acquisitions | Lead Mgr | Researcher | Dispositions | TC | Read Only |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| leads:view | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| leads:edit | ✓ | ✓ | ✓ | ✓ | ✓ | | | | |
| leads:delete | ✓ | ✓ | ✓ | | | | | | |
| leads:export | ✓ | ✓ | ✓ | | ✓ | | | | |
| leads:assign | ✓ | ✓ | ✓ | | ✓ | | | | |
| contacts:view | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| contacts:edit | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | | |
| properties:view | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| properties:edit | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | | |
| pipelines:manage | ✓ | ✓ | | | | | | | |
| tasks:view | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| tasks:edit | ✓ | ✓ | ✓ | ✓ | ✓ | | ✓ | ✓ | |
| communications:send | ✓ | ✓ | ✓ | ✓ | ✓ | | ✓ | | |
| communications:calls_make | ✓ | ✓ | ✓ | ✓ | ✓ | | ✓ | | |
| communications:recordings_view | ✓ | ✓ | ✓ | | | | | | |
| campaigns:manage | ✓ | ✓ | | | ✓ | | | | |
| automations:manage | ✓ | ✓ | | | ✓ | | | | |
| documents:view | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| documents:upload | ✓ | ✓ | ✓ | ✓ | | | ✓ | ✓ | |
| documents:download | ✓ | ✓ | ✓ | ✓ | | | ✓ | ✓ | |
| documents:delete | ✓ | ✓ | | | | | | | |
| deals:view | ✓ | ✓ | ✓ | ✓ | | | ✓ | ✓ | ✓ |
| deals:edit | ✓ | ✓ | ✓ | ✓ | | | ✓ | ✓ | |
| buyers:view | ✓ | ✓ | ✓ | | | | ✓ | ✓ | ✓ |
| buyers:edit | ✓ | ✓ | ✓ | | | | ✓ | | |
| financials:view | ✓ | ✓ | ✓ | | | | | ✓ | |
| reports:view | ✓ | ✓ | ✓ | | ✓ | | ✓ | ✓ | |
| users:manage | ✓ | ✓ | | | | | | | |
| roles:manage | ✓ | ✓ | | | | | | | |
| teams:manage | ✓ | ✓ | | | | | | | |
| integrations:manage | ✓ | ✓ | | | | | | | |
| webhooks:manage | ✓ | ✓ | | | | | | | |
| audit_log:view | ✓ | ✓ | | | | | | | |
| organization:manage | ✓ | ✓ | | | | | | | |

## Enforcement pattern

```ts
// src/lib/rbac.ts
export async function requirePermission(permissionKey: PermissionKey) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const hasPermission = await userHasPermission(session.user.id, permissionKey);
  if (!hasPermission) throw new ForbiddenError(permissionKey);
  return session;
}

// usage in a Server Action
export async function deleteLead(leadId: string) {
  "use server";
  const session = await requirePermission("leads:delete");
  await leadService.softDelete(session.user.organizationId, leadId);
}
```

Tenant isolation is enforced independently of RBAC: every service function takes
`organizationId` from the session, never from client input, and every Prisma query filters on it
(see [`src/lib/db/tenant.ts`](../src/lib/db/tenant.ts)).
