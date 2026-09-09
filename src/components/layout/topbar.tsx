import { SignOutButton } from "./sign-out-button";
import { NotificationBell } from "./notification-bell";

export function TopBar({
  userName,
  roleName,
  unreadNotificationCount,
}: {
  userName: string;
  roleName: string;
  unreadNotificationCount: number;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-6">
      <form action="/search" className="w-96">
        <input
          type="search"
          name="q"
          placeholder="Search leads, contacts, properties..."
          className="w-full rounded-md border border-border bg-white px-3 py-1.5 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </form>
      <div className="flex items-center gap-4">
        <NotificationBell initialUnreadCount={unreadNotificationCount} />
        <div className="text-right">
          <p className="text-sm font-medium text-foreground">{userName}</p>
          <p className="text-xs text-muted">{roleName}</p>
        </div>
        <SignOutButton />
      </div>
    </header>
  );
}
