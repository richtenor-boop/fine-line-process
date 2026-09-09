import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission, currentUserHasPermission } from "@/lib/rbac";
import { getLead } from "@/lib/modules/leads/service";
import { listUsers } from "@/lib/modules/users/service";
import { listCustomFieldDefinitions } from "@/lib/modules/custom-fields/service";
import { listTasks } from "@/lib/modules/tasks/service";
import { listAppointmentsForLead } from "@/lib/modules/appointments/service";
import { getLeadActivityTimeline } from "@/lib/modules/activity/service";
import { listCampaigns, listEnrollmentsForLead } from "@/lib/modules/campaigns/service";
import { stopEnrollmentAction } from "@/lib/modules/campaigns/actions";
import { listDocuments } from "@/lib/modules/documents/service";
import { getAiProvider } from "@/lib/integrations/ai";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NotesSection } from "@/components/domain/notes-section";
import { TagsSection } from "@/components/domain/tags-section";
import { CustomFieldsSection } from "@/components/domain/custom-fields-section";
import { TaskList } from "@/components/domain/task-list";
import { ActivityTimeline } from "@/components/domain/activity-timeline";
import { DocumentsSection } from "@/components/domain/documents-section";
import { DealSection } from "./deal-section";
import { changeStageAction, assignLeadAction } from "./actions";
import { cancelAppointmentAction } from "@/lib/modules/appointments/actions";
import { LeadDetailsForm } from "./lead-details-form";
import { QuickTaskForm } from "@/components/domain/quick-task-form";
import { QuickAppointmentForm } from "./quick-appointment-form";
import { EnrollCampaignForm } from "./enroll-campaign-form";
import { AiInsightsCard } from "./ai-insights-card";

export default async function LeadDetailPage({ params }: PageProps<"/leads/[id]">) {
  const { id } = await params;
  const session = await requirePermission("leads:view");

  const [lead, users, customFieldDefinitions, canAssign, canMessage, canManageCampaigns, tasks, appointments, timeline, documents] =
    await Promise.all([
      getLead(session.user.organizationId, id),
      listUsers(session.user.organizationId),
      listCustomFieldDefinitions(session.user.organizationId, "LEAD"),
      currentUserHasPermission("leads:assign"),
      currentUserHasPermission("communications:send"),
      currentUserHasPermission("campaigns:manage"),
      listTasks(session.user.organizationId, "team", session.user.id, { leadId: id }),
      listAppointmentsForLead(session.user.organizationId, id),
      getLeadActivityTimeline(session.user.organizationId, id),
      listDocuments(session.user.organizationId, { leadId: id }),
    ]);
  if (!lead) notFound();

  const [campaigns, enrollments] = canManageCampaigns
    ? await Promise.all([
        listCampaigns(session.user.organizationId),
        listEnrollmentsForLead(session.user.organizationId, id),
      ])
    : [[], []];

  const customFieldValues = Object.fromEntries(lead.customFieldValues.map((v) => [v.definitionId, v.value ?? ""]));

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {lead.contact.firstName} {lead.contact.lastName}
          </h1>
          {lead.property && (
            <p className="text-sm text-muted">
              <Link href={`/properties/${lead.property.id}`} className="hover:underline">
                {lead.property.addressLine1}, {lead.property.city}, {lead.property.state} {lead.property.zip}
              </Link>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canMessage && (
            <Link
              href={`/inbox/${lead.id}`}
              className="rounded-full border border-border px-3 py-1 text-sm font-medium text-foreground hover:bg-slate-50"
            >
              Communications
            </Link>
          )}
          <Link
            href={`/pipeline/${lead.pipelineId}`}
            className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-foreground hover:bg-slate-200"
          >
            {lead.stage.name}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lead details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <LeadDetailsForm
                leadId={lead.id}
                motivation={lead.motivation}
                timeline={lead.timeline ?? ""}
                askingPrice={lead.askingPrice?.toString() ?? ""}
                offerAmount={lead.offerAmount?.toString() ?? ""}
                nextFollowUpAt={lead.nextFollowUpAt ? lead.nextFollowUpAt.toISOString().slice(0, 10) : ""}
              />
              <div className="border-t border-border pt-4">
                <TagsSection leadId={lead.id} tags={lead.tags} />
              </div>
              <div className="border-t border-border pt-4">
                <CustomFieldsSection
                  entityType="LEAD"
                  entityId={lead.id}
                  definitions={customFieldDefinitions}
                  values={customFieldValues}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <QuickTaskForm leadId={lead.id} />
              <div className="-mx-5">
                <TaskList tasks={tasks} showEntity={false} />
              </div>
            </CardContent>
          </Card>

          <DealSection organizationId={session.user.organizationId} leadId={lead.id} />

          <DocumentsSection documents={documents} leadId={lead.id} />

          <NotesSection notes={lead.notes} leadId={lead.id} />

          <ActivityTimeline events={timeline} />
        </div>

        <div className="space-y-6">
          <AiInsightsCard
            leadId={lead.id}
            initialScore={lead.aiScore}
            initialReason={lead.aiScoreReason}
            isLive={getAiProvider().isLive}
          />

          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {lead.contact.phoneNumbers.map((p) => (
                <p key={p.id}>{p.number}</p>
              ))}
              {lead.contact.emailAddresses.map((e) => (
                <p key={e.id}>{e.email}</p>
              ))}
              {lead.contact.phoneNumbers.length === 0 && lead.contact.emailAddresses.length === 0 && (
                <p className="text-muted">No contact info on file.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pipeline stage</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={changeStageAction} className="space-y-2">
                <input type="hidden" name="leadId" value={lead.id} />
                <select
                  name="stageId"
                  defaultValue={lead.stageId}
                  className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-sm"
                >
                  {lead.pipeline.stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
                <Button type="submit" variant="secondary" className="w-full text-xs">
                  Update stage
                </Button>
              </form>
              <Link href={`/pipeline/${lead.pipelineId}`} className="mt-2 block text-xs text-primary hover:underline">
                View on Kanban board →
              </Link>
            </CardContent>
          </Card>

          {canAssign && (
            <Card>
              <CardHeader>
                <CardTitle>Assigned to</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={assignLeadAction} className="space-y-2">
                  <input type="hidden" name="leadId" value={lead.id} />
                  <select
                    name="assignedUserId"
                    defaultValue={lead.assignedUserId ?? ""}
                    className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-sm"
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" variant="secondary" className="w-full text-xs">
                    Update assignment
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {canManageCampaigns && (
            <Card>
              <CardHeader>
                <CardTitle>Campaigns</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-2">
                  {enrollments.map((e) => (
                    <li key={e.id} className="flex items-center justify-between text-sm">
                      <div>
                        <Link href={`/campaigns/${e.campaignId}`} className="text-primary hover:underline">
                          {e.campaign.name}
                        </Link>
                        <p className="text-xs text-muted">
                          Step {e.currentStepOrder + 1} of {e.campaign.steps.length} · {e.status}
                        </p>
                      </div>
                      {e.status === "ACTIVE" && (
                        <form action={stopEnrollmentAction}>
                          <input type="hidden" name="campaignId" value={e.campaignId} />
                          <input type="hidden" name="leadId" value={lead.id} />
                          <Button type="submit" variant="ghost" className="text-xs">
                            Stop
                          </Button>
                        </form>
                      )}
                    </li>
                  ))}
                  {enrollments.length === 0 && <p className="text-sm text-muted">Not enrolled in any campaign.</p>}
                </ul>
                <EnrollCampaignForm leadId={lead.id} campaigns={campaigns.map((c) => ({ id: c.id, name: c.name }))} />
              </CardContent>
            </Card>
          )}

          {lead.leadSource && (
            <Card>
              <CardHeader>
                <CardTitle>Source</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted">{lead.leadSource.name}</CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Appointments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2">
                {appointments.map((a) => (
                  <li key={a.id} className="text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-foreground">{a.type.replace(/_/g, " ")}</p>
                        <p className="text-xs text-muted">{a.startAt.toLocaleString()}</p>
                        {a.location && <p className="text-xs text-muted">{a.location}</p>}
                      </div>
                      <form action={cancelAppointmentAction}>
                        <input type="hidden" name="appointmentId" value={a.id} />
                        <input type="hidden" name="leadId" value={lead.id} />
                        <Button type="submit" variant="ghost" className="text-xs">
                          Cancel
                        </Button>
                      </form>
                    </div>
                  </li>
                ))}
                {appointments.length === 0 && <p className="text-sm text-muted">Nothing scheduled.</p>}
              </ul>
              <div className="border-t border-border pt-3">
                <QuickAppointmentForm leadId={lead.id} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
