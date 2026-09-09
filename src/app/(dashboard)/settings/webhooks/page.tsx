import { requirePermission } from "@/lib/rbac";
import { listWebhooks } from "@/lib/modules/webhooks/service";
import { toggleWebhookAction, deleteWebhookAction } from "@/lib/modules/webhooks/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateWebhookForm } from "./create-webhook-form";

export default async function WebhooksSettingsPage() {
  const session = await requirePermission("webhooks:manage");
  const webhooks = await listWebhooks(session.user.organizationId);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Webhooks</h1>
        <p className="text-sm text-muted">
          Used by the Automations &quot;Send Webhook&quot; action. Payloads are HMAC-SHA256 signed
          with each webhook&apos;s secret in the <span className="font-mono text-xs">X-FineLine-Signature</span>{" "}
          header.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New webhook</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateWebhookForm />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-2 font-medium">Event</th>
                <th className="px-5 py-2 font-medium">URL</th>
                <th className="px-5 py-2 font-medium">Secret</th>
                <th className="px-5 py-2 font-medium">Status</th>
                <th className="px-5 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {webhooks.map((w) => (
                <tr key={w.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 font-medium text-foreground">{w.event}</td>
                  <td className="px-5 py-3 text-muted">{w.url}</td>
                  <td className="px-5 py-3 font-mono text-xs text-muted">{w.secret.slice(0, 12)}…</td>
                  <td className="px-5 py-3">
                    <span
                      className={
                        w.isActive
                          ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
                          : "rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600"
                      }
                    >
                      {w.isActive ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <form action={toggleWebhookAction} className="inline">
                      <input type="hidden" name="webhookId" value={w.id} />
                      <input type="hidden" name="isActive" value={(!w.isActive).toString()} />
                      <Button type="submit" variant="ghost" className="text-xs">
                        {w.isActive ? "Disable" : "Enable"}
                      </Button>
                    </form>
                    <form action={deleteWebhookAction} className="inline">
                      <input type="hidden" name="webhookId" value={w.id} />
                      <Button type="submit" variant="ghost" className="text-xs text-danger">
                        Delete
                      </Button>
                    </form>
                  </td>
                </tr>
              ))}
              {webhooks.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-muted">
                    No webhooks configured yet.
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
