import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePermission } from "@/lib/rbac";
import { getCampaign } from "@/lib/modules/campaigns/service";
import { removeCampaignStepAction, stopEnrollmentAction } from "@/lib/modules/campaigns/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddCampaignStepForm } from "./add-campaign-step-form";

const CHANNEL_LABELS: Record<string, string> = {
  SMS: "SMS",
  EMAIL: "Email",
  PHONE_TASK: "Phone call (task)",
  VOICEMAIL: "Voicemail (task)",
  DIRECT_MAIL_TASK: "Direct mail (task)",
};

export default async function CampaignDetailPage({ params }: PageProps<"/campaigns/[id]">) {
  const { id } = await params;
  const session = await requirePermission("campaigns:manage");

  const campaign = await getCampaign(session.user.organizationId, id);
  if (!campaign) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold text-foreground">{campaign.name}</h1>

      <Card>
        <CardHeader>
          <CardTitle>Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ol className="space-y-2">
            {campaign.steps.map((step, i) => (
              <li key={step.id} className="flex items-start justify-between gap-2 rounded-md border border-border p-3 text-sm">
                <div>
                  <p className="text-foreground">
                    {i + 1}. {CHANNEL_LABELS[step.channel]}
                    {step.delayDays > 0 && ` — ${step.delayDays} day(s) after previous step`}
                  </p>
                  {step.subject && <p className="text-xs text-muted">Subject: {step.subject}</p>}
                  {step.templateBody && <p className="text-xs text-muted">{step.templateBody}</p>}
                </div>
                <form action={removeCampaignStepAction}>
                  <input type="hidden" name="stepId" value={step.id} />
                  <input type="hidden" name="campaignId" value={campaign.id} />
                  <Button type="submit" variant="ghost" className="text-xs">
                    Remove
                  </Button>
                </form>
              </li>
            ))}
            {campaign.steps.length === 0 && <p className="text-sm text-muted">No steps yet — add one below.</p>}
          </ol>
          <AddCampaignStepForm campaignId={campaign.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Enrolled leads ({campaign.enrollments.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {campaign.enrollments.map((e) => (
              <li key={e.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <div>
                  <Link href={`/leads/${e.leadId}`} className="font-medium text-primary hover:underline">
                    {e.lead.contact.firstName} {e.lead.contact.lastName}
                  </Link>
                  <p className="text-xs text-muted">
                    Step {e.currentStepOrder + 1} of {campaign.steps.length} · {e.status}
                  </p>
                </div>
                {e.status === "ACTIVE" && (
                  <form action={stopEnrollmentAction}>
                    <input type="hidden" name="campaignId" value={campaign.id} />
                    <input type="hidden" name="leadId" value={e.leadId} />
                    <Button type="submit" variant="ghost" className="text-xs">
                      Stop
                    </Button>
                  </form>
                )}
              </li>
            ))}
            {campaign.enrollments.length === 0 && (
              <li className="px-5 py-8 text-center text-sm text-muted">
                No leads enrolled yet — enroll one from its lead detail page.
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
