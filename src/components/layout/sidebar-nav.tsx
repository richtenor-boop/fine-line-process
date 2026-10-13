import Image from "next/image";
import Link from "next/link";
import { NAV_ITEMS, SETTINGS_NAV_ITEMS, type NavItem } from "./nav-items";
import { NavLink } from "./nav-link";
import { cn } from "@/lib/cn";
import type { PermissionKey } from "@/lib/rbac/permissions";

function filterVisible(items: NavItem[], granted: Set<PermissionKey>) {
  return items.filter((item) => !item.permission || granted.has(item.permission));
}

export function SidebarNav({ granted, className }: { granted: Set<PermissionKey>; className?: string }) {
  const mainItems = filterVisible(NAV_ITEMS, granted);
  const settingsItems = filterVisible(SETTINGS_NAV_ITEMS, granted);

  return (
    <nav className={cn("flex h-full w-64 shrink-0 flex-col bg-sidebar", className)}>
      <Link href="/dashboard" className="flex items-center gap-3 px-4 py-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white p-1 shadow-sm">
          <Image src="/brand/logo-mark.png" alt="" width={40} height={30} className="h-auto w-full" priority />
        </span>
        <span className="leading-tight">
          <span className="block text-base font-semibold tracking-tight text-white">Fine Line Process</span>
          <span className="block text-[10px] font-medium uppercase tracking-[0.14em] text-accent">
            Smart processes
          </span>
        </span>
      </Link>
      <div className="flex-1 overflow-y-auto pb-4">
        <ul className="space-y-0.5 px-2">
          {mainItems.map((item) => (
            <li key={item.href}>
              <NavLink href={item.href} label={item.label} />
            </li>
          ))}
        </ul>
        {settingsItems.length > 0 && (
          <div className="mt-4 border-t border-white/10 px-2 pt-3">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-accent/80">Settings</p>
            <ul className="space-y-0.5">
              {settingsItems.map((item) => (
                <li key={item.href}>
                  <NavLink href={item.href} label={item.label} compact />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </nav>
  );
}
