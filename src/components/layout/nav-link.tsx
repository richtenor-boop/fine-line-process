"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export function NavLink({ href, label, compact = false }: { href: string; label: string; compact?: boolean }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center rounded-md border-l-2 px-3 text-sm transition-colors",
        compact ? "py-1.5" : "py-2 font-medium",
        active
          ? "border-accent bg-white/10 text-white"
          : "border-transparent text-sidebar-foreground hover:bg-white/5 hover:text-white",
      )}
    >
      {label}
    </Link>
  );
}
