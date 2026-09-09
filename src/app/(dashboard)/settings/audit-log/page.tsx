import { requirePermission } from "@/lib/rbac";
import { listAuditLog } from "@/lib/modules/audit/service";
import { Card, CardContent } from "@/components/ui/card";

export default async function AuditLogSettingsPage() {
  const session = await requirePermission("audit_log:view");
  const logs = await listAuditLog(session.user.organizationId);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Audit log</h1>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-2 font-medium">When</th>
                <th className="px-5 py-2 font-medium">Who</th>
                <th className="px-5 py-2 font-medium">Action</th>
                <th className="px-5 py-2 font-medium">Entity</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 whitespace-nowrap text-muted">
                    {log.createdAt.toLocaleString()}
                  </td>
                  <td className="px-5 py-3">{log.user ? log.user.name : "System"}</td>
                  <td className="px-5 py-3 font-mono text-xs">{log.action}</td>
                  <td className="px-5 py-3 text-muted">
                    {log.entityType} · {log.entityId.slice(0, 10)}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-muted">
                    No activity yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
