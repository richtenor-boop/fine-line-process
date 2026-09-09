import Link from "next/link";
import { NAV_ITEMS, SETTINGS_NAV_ITEMS, type NavItem } from "./nav-items";
import type { PermissionKey } from "@/lib/rbac/permissions";

function filterVisible(items: NavItem[], granted: Set<PermissionKey>) {
  return items.filter((item) => !item.permission || granted.has(item.permission));
}

export function SidebarNav({ granted }: { granted: Set<PermissionKey> }) {
  const mainItems = filterVisible(NAV_ITEMS, granted);
  const settingsItems = filterVisible(SETTINGS_NAV_ITEMS, granted);

  return (
    <nav className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-surface">
      <div className="px-4 py-5">
        <span className="text-lg font-semibold tracking-tight text-foreground">Fine Line Process</span>
      </div>
      <ul className="flex-1 space-y-0.5 overflow-y-auto px-2">
        {mainItems.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-slate-100 hover:text-foreground"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
      {settingsItems.length > 0 && (
        <div className="border-t border-border px-2 py-2">
          <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted">Settings</p>
          <ul className="space-y-0.5">
            {settingsItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center rounded-md px-3 py-2 text-sm text-foreground/80 hover:bg-slate-100 hover:text-foreground"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
}
