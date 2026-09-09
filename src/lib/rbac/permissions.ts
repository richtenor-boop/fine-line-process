/**
 * Source of truth for the permission catalog and the default role → permission matrix.
 * Mirrors docs/04-rbac-matrix.md exactly — update both together. Consumed by prisma/seed.ts
 * (to create the Permission/Role/RolePermission rows) and by src/lib/rbac.ts (to type-check
 * every `requirePermission()` call against a real key).
 */

export const PERMISSIONS = [
  { key: "leads:view", description: "View lead records" },
  { key: "leads:edit", description: "Create/update leads, change pipeline stage" },
  { key: "leads:delete", description: "Soft-delete leads" },
  { key: "leads:export", description: "Export lead lists to CSV" },
  { key: "leads:assign", description: "Reassign a lead to another user" },
  { key: "contacts:view", description: "View contact records" },
  { key: "contacts:edit", description: "Create/update contacts, phones, emails, addresses" },
  { key: "properties:view", description: "View property records" },
  { key: "properties:edit", description: "Create/update property records" },
  { key: "pipelines:manage", description: "Create/edit pipelines and stages" },
  { key: "tasks:view", description: "View tasks" },
  { key: "tasks:edit", description: "Create/update/complete tasks and appointments" },
  { key: "communications:send", description: "Send SMS / email to a lead" },
  { key: "communications:calls_make", description: "Place outbound calls (click-to-call)" },
  { key: "communications:recordings_view", description: "Listen to / read call recordings & transcripts" },
  { key: "campaigns:manage", description: "Create/edit/start/stop campaigns" },
  { key: "automations:manage", description: "Create/edit/activate automations" },
  { key: "documents:view", description: "View/preview documents" },
  { key: "documents:upload", description: "Upload documents" },
  { key: "documents:download", description: "Download original document files" },
  { key: "documents:delete", description: "Delete documents" },
  { key: "deals:view", description: "View deals, offers, contracts" },
  { key: "deals:edit", description: "Create/update offers, contracts, deals" },
  { key: "buyers:view", description: "View buyer records" },
  { key: "buyers:edit", description: "Create/update buyer records and criteria" },
  { key: "financials:view", description: "View marketing spend, revenue, profit figures" },
  { key: "reports:view", description: "Access the Reports section" },
  { key: "users:manage", description: "Invite/deactivate users, change their role" },
  { key: "roles:manage", description: "Toggle permissions on a role" },
  { key: "teams:manage", description: "Create/edit teams and membership" },
  { key: "integrations:manage", description: "Connect/disconnect third-party providers" },
  { key: "webhooks:manage", description: "Create/edit outbound webhooks" },
  { key: "audit_log:view", description: "View the organization audit log" },
  { key: "organization:manage", description: "Edit org profile, timezone; org-level settings" },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

export const SYSTEM_ROLES = [
  "Owner",
  "Administrator",
  "Manager",
  "Acquisitions",
  "Lead Manager",
  "Researcher",
  "Dispositions",
  "Transaction Coordinator",
  "Read Only",
] as const;

export type SystemRoleName = (typeof SYSTEM_ROLES)[number];

// Default grants per role — mirrors the matrix table in docs/04-rbac-matrix.md.
export const DEFAULT_ROLE_PERMISSIONS: Record<SystemRoleName, PermissionKey[]> = {
  Owner: PERMISSIONS.map((p) => p.key) as PermissionKey[],
  Administrator: PERMISSIONS.map((p) => p.key) as PermissionKey[],
  Manager: [
    "leads:view", "leads:edit", "leads:delete", "leads:export", "leads:assign",
    "contacts:view", "contacts:edit",
    "properties:view", "properties:edit",
    "tasks:view", "tasks:edit",
    "communications:send", "communications:calls_make", "communications:recordings_view",
    "documents:view", "documents:upload", "documents:download",
    "deals:view", "deals:edit",
    "buyers:view", "buyers:edit",
    "financials:view", "reports:view",
  ],
  Acquisitions: [
    "leads:view", "leads:edit",
    "contacts:view", "contacts:edit",
    "properties:view", "properties:edit",
    "tasks:view", "tasks:edit",
    "communications:send", "communications:calls_make",
    "documents:view", "documents:upload", "documents:download",
    "deals:view", "deals:edit",
  ],
  "Lead Manager": [
    "leads:view", "leads:edit", "leads:export", "leads:assign",
    "contacts:view", "contacts:edit",
    "properties:view", "properties:edit",
    "tasks:view", "tasks:edit",
    "communications:send", "communications:calls_make",
    "campaigns:manage", "automations:manage",
    "documents:view",
    "reports:view",
  ],
  Researcher: [
    "leads:view",
    "contacts:view", "contacts:edit",
    "properties:view", "properties:edit",
    "tasks:view",
    "documents:view",
  ],
  Dispositions: [
    "leads:view",
    "contacts:view",
    "properties:view",
    "tasks:view", "tasks:edit",
    "communications:send", "communications:calls_make",
    "documents:view", "documents:upload", "documents:download",
    "deals:view", "deals:edit",
    "buyers:view", "buyers:edit",
    "reports:view",
  ],
  "Transaction Coordinator": [
    "leads:view",
    "contacts:view",
    "properties:view",
    "tasks:view", "tasks:edit",
    "documents:view", "documents:upload", "documents:download",
    "deals:view", "deals:edit",
    "buyers:view",
    "financials:view", "reports:view",
  ],
  "Read Only": [
    "leads:view", "contacts:view", "properties:view", "tasks:view",
    "documents:view", "deals:view", "buyers:view",
  ],
};
