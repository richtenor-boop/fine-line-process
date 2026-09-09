import Link from "next/link";
import { requirePermission } from "@/lib/rbac";
import { listInboxOverview } from "@/lib/modules/communications/service";
import { Card, CardContent } from "@/components/ui/card";

const CHANNEL_LABEL: Record<string, string> = { SMS: "SMS", EMAIL: "Email", CALL: "Call" };

export default async function InboxPage() {
  const session = await requirePermission("communications:send");
  const rows = await listInboxOverview(session.user.organizationId);

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Inbox</h1>

      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {rows.map((row) => (
              <li key={row.leadId}>
                <Link href={`/inbox/${row.leadId}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{row.contactName}</p>
                    <p className="truncate text-sm text-muted">{row.preview}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-foreground">
                      {CHANNEL_LABEL[row.lastChannel]}
                    </span>
                    <p className="mt-1 text-xs text-muted">{row.lastActivityAt.toLocaleString()}</p>
                  </div>
                </Link>
              </li>
            ))}
            {rows.length === 0 && (
              <li className="px-5 py-8 text-center text-sm text-muted">
                No conversations yet. Open a lead and send a message, log a call, or simulate an
                inbound one to see it here.
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
