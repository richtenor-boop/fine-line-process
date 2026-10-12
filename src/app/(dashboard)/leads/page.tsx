import Link from "next/link";
import { requirePermission } from "@/lib/rbac";
import { listLeads, listRecentActivityForLeads, type ListLeadsFilters } from "@/lib/modules/leads/service";
import { ViewSwitcher, BadgeView, TableView, ActivityView, CalendarView, LEAD_VIEWS, type LeadView } from "./lead-views";
import { listUsers } from "@/lib/modules/users/service";
import { listTags } from "@/lib/modules/tags/service";
import { getDefaultPipeline } from "@/lib/modules/pipelines/service";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function LeadsPage({ searchParams }: PageProps<"/leads">) {
  const session = await requirePermission("leads:view");
  const params = await searchParams;

  const filters: ListLeadsFilters = {
    assignedUserId: first(params.assignedUserId) || undefined,
    stageId: first(params.stageId) || undefined,
    leadSourceId: first(params.leadSourceId) || undefined,
    tagId: first(params.tagId) || undefined,
    motivation: (first(params.motivation) || undefined) as ListLeadsFilters["motivation"],
    state: first(params.state) || undefined,
    county: first(params.county) || undefined,
    city: first(params.city) || undefined,
    zip: first(params.zip) || undefined,
    propertyType: (first(params.propertyType) || undefined) as ListLeadsFilters["propertyType"],
    minEquity: first(params.minEquity) ? Number(first(params.minEquity)) : undefined,
  };

  const [leads, users, tags, defaultPipeline, leadSources] = await Promise.all([
    listLeads(session.user.organizationId, filters),
    listUsers(session.user.organizationId),
    listTags(session.user.organizationId),
    getDefaultPipeline(session.user.organizationId),
    prisma.leadSource.findMany({ where: { organizationId: session.user.organizationId }, orderBy: { name: "asc" } }),
  ]);

  const rawView = first(params.view);
  const view: LeadView = (LEAD_VIEWS as readonly string[]).includes(rawView) ? (rawView as LeadView) : "badge";
  const queryParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const v = first(value);
    if (v && key !== "view") queryParams.set(key, v);
  }
  const creatorNames = new Map(users.map((u) => [u.id, u.name]));
  const activity = view === "activity" ? await listRecentActivityForLeads(session.user.organizationId, leads.map((l) => l.id)) : [];

  const stages = defaultPipeline
    ? await prisma.pipelineStage.findMany({ where: { pipelineId: defaultPipeline.id }, orderBy: { order: "asc" } })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Leads</h1>
        <div className="flex gap-2">
          <Link href="/leads/import">
            <Button variant="secondary">Import CSV</Button>
          </Link>
          <Link href="/leads/new">
            <Button>Add seller lead</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="pt-5">
          <form className="grid grid-cols-2 gap-3 sm:grid-cols-4" action="/leads">
            <input type="hidden" name="view" value={view} />
            <Select name="stageId" defaultValue={filters.stageId ?? ""} className="h-9 py-1 text-sm">
              <option value="">Any stage</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Select name="assignedUserId" defaultValue={filters.assignedUserId ?? ""} className="h-9 py-1 text-sm">
              <option value="">Any assignee</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
            <Select name="motivation" defaultValue={filters.motivation ?? ""} className="h-9 py-1 text-sm">
              <option value="">Any motivation</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="UNKNOWN">Unknown</option>
            </Select>
            <Select name="leadSourceId" defaultValue={filters.leadSourceId ?? ""} className="h-9 py-1 text-sm">
              <option value="">Any source</option>
              {leadSources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Select name="tagId" defaultValue={filters.tagId ?? ""} className="h-9 py-1 text-sm">
              <option value="">Any tag</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
            <Input name="state" placeholder="State" defaultValue={filters.state ?? ""} className="h-9 py-1 text-sm" />
            <Input name="county" placeholder="County" defaultValue={filters.county ?? ""} className="h-9 py-1 text-sm" />
            <Input name="city" placeholder="City" defaultValue={filters.city ?? ""} className="h-9 py-1 text-sm" />
            <Input name="zip" placeholder="ZIP" defaultValue={filters.zip ?? ""} className="h-9 py-1 text-sm" />
            <Select name="propertyType" defaultValue={filters.propertyType ?? ""} className="h-9 py-1 text-sm">
              <option value="">Any property type</option>
              <option value="SINGLE_FAMILY">Single Family</option>
              <option value="MULTI_FAMILY">Multi Family</option>
              <option value="CONDO">Condo</option>
              <option value="TOWNHOME">Townhome</option>
              <option value="MOBILE_HOME">Mobile Home</option>
              <option value="LAND">Land</option>
              <option value="COMMERCIAL">Commercial</option>
              <option value="OTHER">Other</option>
            </Select>
            <Input
              name="minEquity"
              type="number"
              placeholder="Min. equity ($)"
              defaultValue={filters.minEquity ?? ""}
              className="h-9 py-1 text-sm"
            />
            <div className="flex gap-2">
              <Button type="submit" variant="secondary" className="text-xs">
                Apply filters
              </Button>
              <Link href="/leads" className="self-center text-xs text-muted hover:underline">
                Clear
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <ViewSwitcher
        current={view}
        params={queryParams}
        count={leads.length}
        pipelineHref={defaultPipeline ? `/pipeline/${defaultPipeline.id}` : null}
      />

      {view === "badge" && <BadgeView leads={leads} creatorNames={creatorNames} />}
      {view === "table" && <TableView leads={leads} />}
      {view === "activity" && <ActivityView items={activity} leadsById={new Map(leads.map((l) => [l.id, l]))} />}
      {view === "calendar" && <CalendarView leads={leads} />}
    </div>
  );
}
