import { headers } from "next/headers";
import { requirePermission } from "@/lib/rbac";
import { env } from "@/lib/env";
import { listLeadForms } from "@/lib/modules/lead-forms/service";
import { toggleLeadFormAction } from "@/lib/modules/lead-forms/actions";
import { listUsers } from "@/lib/modules/users/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateLeadFormForm } from "./create-lead-form-form";
import { CopyButton } from "./copy-button";

async function appOrigin(): Promise<string> {
  if (env.NEXTAUTH_URL) return env.NEXTAUTH_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function LeadFormsSettingsPage() {
  const session = await requirePermission("campaigns:manage");
  const [forms, users, origin] = await Promise.all([
    listLeadForms(session.user.organizationId),
    listUsers(session.user.organizationId),
    appOrigin(),
  ]);
  const userNames = new Map(users.map((u) => [u.id, u.name]));
  const activeUsers = users.filter((u) => u.status === "ACTIVE").map((u) => ({ id: u.id, name: u.name }));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Lead Capture Forms</h1>
        <p className="text-sm text-muted">
          Public seller intake forms for your website or ads. Each submission creates a lead (or attaches to the
          seller&apos;s existing lead when their phone or email already exists), notifies the assignee, and fires
          the &quot;Web Form Submitted&quot; automation trigger.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New form</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateLeadFormForm users={activeUsers} />
        </CardContent>
      </Card>

      {forms.map((form) => {
        const url = `${origin}/f/${form.publicToken}`;
        const embed = `<iframe src="${url}" title="${form.name.replace(/"/g, "&quot;")}" style="width:100%;min-height:760px;border:0"></iframe>`;
        return (
          <Card key={form.id}>
            <CardContent className="space-y-3 pt-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">{form.name}</p>
                  <p className="text-xs text-muted">
                    Source: {form.leadSourceName} · Assigned to:{" "}
                    {form.assignedUserId ? (userNames.get(form.assignedUserId) ?? "—") : "Unassigned"} ·{" "}
                    {form._count.submissions} submission{form._count.submissions === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={
                      form.isActive
                        ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
                        : "rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600"
                    }
                  >
                    {form.isActive ? "Live" : "Off"}
                  </span>
                  <form action={toggleLeadFormAction}>
                    <input type="hidden" name="formId" value={form.id} />
                    <input type="hidden" name="isActive" value={(!form.isActive).toString()} />
                    <Button type="submit" variant="ghost" className="text-xs">
                      {form.isActive ? "Turn off" : "Turn on"}
                    </Button>
                  </form>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded bg-slate-100 px-2 py-1 text-xs">{url}</code>
                  <CopyButton text={url} label="Copy link" />
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                    Open
                  </a>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded bg-slate-100 px-2 py-1 text-xs">{embed}</code>
                  <CopyButton text={embed} label="Copy embed code" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
      {forms.length === 0 && <p className="text-sm text-muted">No forms yet. Create one above to get a shareable link.</p>}
    </div>
  );
}
