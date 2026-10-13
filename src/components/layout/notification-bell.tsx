"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  fetchRecentNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/lib/modules/notifications/actions";

interface NotificationRow {
  id: string;
  title: string;
  body: string | null;
  readAt: Date | null;
  createdAt: Date;
  entityType: string | null;
  entityId: string | null;
}

function entityHref(row: NotificationRow): string | null {
  if (row.entityType === "Lead" && row.entityId) return `/leads/${row.entityId}`;
  if (row.entityType === "Task" && row.entityId) return `/tasks`;
  return null;
}

export function NotificationBell({ initialUnreadCount }: { initialUnreadCount: number }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) {
      startTransition(async () => {
        const rows = await fetchRecentNotificationsAction();
        setNotifications(rows);
      });
    }
  }

  function onClickNotification(row: NotificationRow) {
    setOpen(false);
    if (!row.readAt) {
      setUnreadCount((c) => Math.max(0, c - 1));
      startTransition(async () => {
        await markNotificationReadAction(row.id);
      });
    }
    const href = entityHref(row);
    if (href) router.push(href);
  }

  function onMarkAllRead() {
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date() })));
    startTransition(async () => {
      await markAllNotificationsReadAction();
    });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggleOpen}
        aria-label="Notifications"
        className="relative rounded-full p-2 text-muted hover:bg-slate-100 hover:text-foreground"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-medium text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-md border border-border bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-sm font-medium text-foreground">Notifications</p>
            <button onClick={onMarkAllRead} className="text-xs text-primary hover:underline">
              Mark all read
            </button>
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {notifications.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => onClickNotification(n)}
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${n.readAt ? "" : "bg-accent-soft"}`}
                >
                  <p className="text-foreground">{n.title}</p>
                  {n.body && <p className="text-xs text-muted">{n.body}</p>}
                  <p className="mt-0.5 text-xs text-muted">{n.createdAt.toLocaleString()}</p>
                </button>
              </li>
            ))}
            {notifications.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">No notifications yet.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
