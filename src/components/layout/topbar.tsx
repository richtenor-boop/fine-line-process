import { SignOutButton } from "./sign-out-button";
import { NotificationBell } from "./notification-bell";
import { MobileNav } from "./mobile-nav";

export function TopBar({
  userName,
  roleName,
  unreadNotificationCount,
  mobileNav,
}: {
  userName: string;
  roleName: string;
  unreadNotificationCount: number;
  mobileNav: React.ReactNode;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 sm:px-6">
      <MobileNav>{mobileNav}</MobileNav>
      <form action="/search" className="min-w-0 flex-1 sm:max-w-96">
        <input
          type="search"
          name="q"
          placeholder="Search leads, contacts, properties..."
          className="w-full rounded-md border border-border bg-white px-3 py-1.5 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
        />
      </form>
      <div className="ml-auto flex items-center gap-3 sm:gap-4">
        <NotificationBell initialUnreadCount={unreadNotificationCount} />
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-foreground">{userName}</p>
          <p className="text-xs text-muted">{roleName}</p>
        </div>
        <SignOutButton />
      </div>
    </header>
  );
}
