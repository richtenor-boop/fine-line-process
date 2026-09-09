import type { PermissionKey } from "@/lib/rbac/permissions";

export interface NavItem {
  label: string;
  href: string;
  permission?: PermissionKey;
  phase: number;
}

// Mirrors docs/03-sitemap.md. `permission` gates visibility (UI nicety — every page also
// re-checks server-side); items with no `permission` are visible to any authenticated user.
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", phase: 1 },
  { label: "Leads", href: "/leads", permission: "leads:view", phase: 2 },
  { label: "Properties", href: "/properties", permission: "properties:view", phase: 2 },
  { label: "Pipeline", href: "/pipeline", permission: "leads:view", phase: 3 },
  { label: "Tasks", href: "/tasks", permission: "tasks:view", phase: 3 },
  { label: "Inbox", href: "/inbox", permission: "communications:send", phase: 5 },
  { label: "Campaigns", href: "/campaigns", permission: "campaigns:manage", phase: 6 },
  { label: "Automations", href: "/automations", permission: "automations:manage", phase: 6 },
  { label: "Calendar", href: "/calendar", permission: "tasks:view", phase: 7 },
  { label: "Buyers", href: "/buyers", permission: "buyers:view", phase: 7 },
  { label: "Deals", href: "/deals", permission: "deals:view", phase: 7 },
  { label: "Documents", href: "/documents", permission: "documents:view", phase: 7 },
  { label: "Reports", href: "/reports", permission: "reports:view", phase: 8 },
];

export const SETTINGS_NAV_ITEMS: NavItem[] = [
  { label: "Organization", href: "/settings/organization", permission: "organization:manage", phase: 1 },
  { label: "Users", href: "/settings/users", permission: "users:manage", phase: 1 },
  { label: "Roles", href: "/settings/roles", permission: "roles:manage", phase: 1 },
  { label: "Teams", href: "/settings/teams", permission: "teams:manage", phase: 1 },
  { label: "Audit Log", href: "/settings/audit-log", permission: "audit_log:view", phase: 1 },
  { label: "Pipelines", href: "/settings/pipelines", permission: "pipelines:manage", phase: 3 },
  { label: "Custom Fields", href: "/settings/custom-fields", permission: "organization:manage", phase: 2 },
  { label: "Tags", href: "/settings/tags", permission: "organization:manage", phase: 2 },
  { label: "Integrations", href: "/settings/integrations", permission: "integrations:manage", phase: 5 },
  { label: "Webhooks", href: "/settings/webhooks", permission: "webhooks:manage", phase: 6 },
];
