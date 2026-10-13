import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getGrantedPermissionKeys } from "@/lib/rbac";
import { countUnreadNotifications } from "@/lib/modules/notifications/service";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { TopBar } from "@/components/layout/topbar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [granted, unreadNotificationCount] = await Promise.all([
    getGrantedPermissionKeys(session.user.roleId),
    countUnreadNotifications(session.user.organizationId, session.user.id),
  ]);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <SidebarNav granted={granted} className="hidden lg:flex" />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          userName={session.user.name}
          roleName={session.user.roleName}
          unreadNotificationCount={unreadNotificationCount}
          mobileNav={<SidebarNav granted={granted} />}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
