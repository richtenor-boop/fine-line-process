import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { getLead } from "@/lib/modules/leads/service";
import { listCommunicationsForLead } from "@/lib/modules/communications/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Thread } from "./thread";
import { ComposeBox } from "./compose-box";
import { CompliancePanel } from "./compliance-panel";
import { SummarizeButton } from "./summarize-button";

export default async function InboxThreadPage({ params }: PageProps<"/inbox/[leadId]">) {
  const { leadId } = await params;
  const session = await requirePermission("communications:send");

  const [lead, events] = await Promise.all([
    getLead(session.user.organizationId, leadId),
    listCommunicationsForLead(session.user.organizationId, leadId),
  ]);
  if (!lead) notFound();

  const phones = lead.contact.phoneNumbers.map((p) => ({
    id: p.id,
    number: p.number,
    isDncListed: p.isDncListed,
    smsOptedOut: p.smsOptedOut,
  }));
  const emails = lead.contact.emailAddresses.map((e) => ({ id: e.id, email: e.email, unsubscribed: e.unsubscribed }));

  return (
    <div className="grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div>
          <Link href={`/leads/${lead.id}`} className="text-sm text-primary hover:underline">
            ← {lead.contact.firstName} {lead.contact.lastName}
          </Link>
          <h1 className="text-xl font-semibold text-foreground">Conversation</h1>
        </div>

        <SummarizeButton leadId={lead.id} />

        <Card>
          <CardContent className="max-h-[28rem] overflow-y-auto pt-5">
            <Thread events={[...events].reverse()} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <ComposeBox leadId={lead.id} phones={phones} emails={emails} />
          </CardContent>
        </Card>
      </div>

      <div>
        <Card>
          <CardHeader>
            <CardTitle>Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <CompliancePanel leadId={lead.id} phones={phones} emails={emails} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
