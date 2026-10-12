import Link from "next/link";
import { LayoutGrid, Table2, Columns3, Activity, CalendarDays, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import type { listLeads, LeadActivityItem } from "@/lib/modules/leads/service";

export type LeadRow = Awaited<ReturnType<typeof listLeads>>[number];
export const LEAD_VIEWS = ["badge", "table", "activity", "calendar"] as const;
export type LeadView = (typeof LEAD_VIEWS)[number];

const VIEW_META: Record<LeadView, { label: string; Icon: typeof LayoutGrid }> = {
  badge: { label: "Badge", Icon: LayoutGrid },
  table: { label: "Table", Icon: Table2 },
  activity: { label: "Activity", Icon: Activity },
  calendar: { label: "Calendar", Icon: CalendarDays },
};

function address(lead: LeadRow): string {
  const p = lead.property;
  return p ? `${p.addressLine1} ${p.city} ${p.state} ${p.zip}` : `${lead.contact.firstName} ${lead.contact.lastName}`;
}

function money(v: { toString(): string } | null | undefined): string | null {
  return v == null ? null : `$${Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function shortDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}

export function ViewSwitcher({
  current,
  params,
  count,
  pipelineHref,
}: {
  current: LeadView;
  params: URLSearchParams;
  count: number;
  pipelineHref: string | null;
}) {
  const hrefFor = (view: LeadView) => {
    const next = new URLSearchParams(params);
    next.set("view", view);
    return `/leads?${next.toString()}`;
  };
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border pb-3">
      {LEAD_VIEWS.map((view) => {
        const { label, Icon } = VIEW_META[view];
        const active = view === current;
        return (
          <Link
            key={view}
            href={hrefFor(view)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm",
              active ? "bg-primary text-white" : "text-muted hover:bg-slate-100 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
      {pipelineHref && (
        <Link href={pipelineHref} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted hover:bg-slate-100 hover:text-foreground">
          <Columns3 className="h-4 w-4" />
          Card (board)
        </Link>
      )}
      <span className="ml-auto text-sm text-muted">
        {count === 200 ? "Showing newest 200" : `${count} lead${count === 1 ? "" : "s"}`}
      </span>
    </div>
  );
}

export function BadgeView({ leads, creatorNames }: { leads: LeadRow[]; creatorNames: Map<string, string> }) {
  if (leads.length === 0) return <EmptyState />;
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {leads.map((lead) => {
        const value = money(lead.property?.arv) ?? money(lead.property?.estimatedValue);
        return (
          <Link key={lead.id} href={`/leads/${lead.id}`} className="group block">
            <Card className="flex h-full flex-col border-t-2 border-t-accent/70 transition-shadow group-hover:shadow-md">
              <div className="px-5 pt-4 pb-3">
                <p className="text-base font-semibold leading-snug text-foreground group-hover:text-primary">{address(lead)}</p>
                {lead.property && (
                  <p className="mt-0.5 text-xs text-muted">
                    {lead.contact.firstName} {lead.contact.lastName}
                  </p>
                )}
              </div>
              <div className="relative max-h-36 overflow-hidden bg-slate-50 px-5 py-3 text-sm text-foreground">
                {lead.notes.length > 0 ? (
                  lead.notes.map((n) => (
                    <p key={n.id} className="mb-1.5 last:mb-0">
                      <span className="text-muted">{n.createdAt.toLocaleDateString("en-US")} </span>
                      {n.body}
                    </p>
                  ))
                ) : (
                  <p className="italic text-muted">No notes yet</p>
                )}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-slate-50" />
              </div>
              <div className="flex-1 space-y-2 px-5 py-3 text-sm">
                <div className="flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{lead.stage.name}</span>
                  {lead.motivation !== "UNKNOWN" && (
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-strong">
                      {lead.motivation.toLowerCase()} motivation
                    </span>
                  )}
                </div>
                <p className={lead.nextFollowUpAt ? "font-medium text-foreground" : "italic text-muted"}>
                  {lead.nextFollowUpAt ? `Follow up ${shortDate(lead.nextFollowUpAt)}` : "Follow-up not set"}
                </p>
                <p className={value ? "text-foreground" : "italic text-muted"}>
                  {value ? `Worth ${value}` : "What is property worth not set"}
                </p>
              </div>
              <div className="flex items-center justify-between border-t border-border px-5 py-2.5 text-xs text-muted">
                <span>
                  {shortDate(lead.createdAt)}
                  {lead.createdById && creatorNames.get(lead.createdById) ? ` by ${creatorNames.get(lead.createdById)}` : ""}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {lead._count.notes}
                </span>
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

export function TableView({ leads }: { leads: LeadRow[] }) {
  return (
    <Card>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-5 py-2 font-medium">Property</th>
              <th className="px-5 py-2 font-medium">Owner</th>
              <th className="px-5 py-2 font-medium">Stage</th>
              <th className="px-5 py-2 font-medium">Motivation</th>
              <th className="px-5 py-2 font-medium">Follow-up</th>
              <th className="px-5 py-2 font-medium">Value</th>
              <th className="px-5 py-2 font-medium">Assigned</th>
              <th className="px-5 py-2 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b border-border last:border-0 hover:bg-slate-50">
                <td className="px-5 py-3">
                  <Link href={`/leads/${lead.id}`} className="font-medium text-primary hover:underline">
                    {lead.property ? `${lead.property.addressLine1}, ${lead.property.city}` : "—"}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-foreground">
                  {lead.contact.firstName} {lead.contact.lastName}
                </td>
                <td className="px-5 py-3">
                  <span className="whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-foreground">
                    {lead.stage.name}
                  </span>
                </td>
                <td className="px-5 py-3 text-muted">{lead.motivation.toLowerCase()}</td>
                <td className="whitespace-nowrap px-5 py-3 text-muted">{lead.nextFollowUpAt ? shortDate(lead.nextFollowUpAt) : "—"}</td>
                <td className="whitespace-nowrap px-5 py-3 text-muted">
                  {money(lead.property?.arv) ?? money(lead.property?.estimatedValue) ?? "—"}
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-muted">{lead.assignedUser?.name ?? "Unassigned"}</td>
                <td className="whitespace-nowrap px-5 py-3 text-muted">{shortDate(lead.createdAt)}</td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-muted">
                  No leads match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

const KIND_LABEL: Record<LeadActivityItem["kind"], string> = { note: "Note", stage: "Stage", call: "Call", sms: "Text", email: "Email" };

export function ActivityView({ items, leadsById }: { items: LeadActivityItem[]; leadsById: Map<string, LeadRow> }) {
  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">No activity yet on these leads.</p>;
  }
  const dayOf = (d: Date) => d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  return (
    <Card>
      <CardContent className="divide-y divide-border p-0">
        {items.map((item, index) => {
          const lead = leadsById.get(item.leadId);
          const day = dayOf(item.at);
          const showDay = index === 0 || day !== dayOf(items[index - 1].at);
          return (
            <div key={item.id}>
              {showDay && <p className="bg-slate-50 px-5 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted">{day}</p>}
              <div className="flex gap-3 px-5 py-3 text-sm">
                <span className="w-14 shrink-0 text-xs text-muted">
                  {item.at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </span>
                <span className="w-12 shrink-0 text-xs font-medium text-accent-strong">{KIND_LABEL[item.kind]}</span>
                <div className="min-w-0">
                  {lead && (
                    <Link href={`/leads/${lead.id}`} className="font-medium text-primary hover:underline">
                      {address(lead)}
                    </Link>
                  )}
                  <p className="line-clamp-2 text-foreground">{item.text}</p>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function CalendarView({ leads }: { leads: LeadRow[] }) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday.getTime() + 86400000);
  const endOfWeek = new Date(startOfToday.getTime() + 7 * 86400000);
  const withDate = leads
    .filter((l) => l.nextFollowUpAt)
    .sort((a, b) => a.nextFollowUpAt!.getTime() - b.nextFollowUpAt!.getTime());
  const groups: { title: string; tone: string; leads: LeadRow[] }[] = [
    { title: "Overdue", tone: "text-danger", leads: withDate.filter((l) => l.nextFollowUpAt! < startOfToday) },
    { title: "Today", tone: "text-accent-strong", leads: withDate.filter((l) => l.nextFollowUpAt! >= startOfToday && l.nextFollowUpAt! < endOfToday) },
    { title: "Next 7 days", tone: "text-foreground", leads: withDate.filter((l) => l.nextFollowUpAt! >= endOfToday && l.nextFollowUpAt! < endOfWeek) },
    { title: "Later", tone: "text-muted", leads: withDate.filter((l) => l.nextFollowUpAt! >= endOfWeek) },
  ];
  const unscheduled = leads.length - withDate.length;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {groups.map((g) => (
          <Card key={g.title}>
            <CardContent className="space-y-2 pt-4">
              <p className={cn("text-sm font-semibold", g.tone)}>
                {g.title} <span className="font-normal text-muted">({g.leads.length})</span>
              </p>
              <ul className="divide-y divide-border">
                {g.leads.map((lead) => (
                  <li key={lead.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <Link href={`/leads/${lead.id}`} className="min-w-0 truncate text-primary hover:underline">
                      {address(lead)}
                    </Link>
                    <span className="shrink-0 text-xs text-muted">{shortDate(lead.nextFollowUpAt!)}</span>
                  </li>
                ))}
                {g.leads.length === 0 && <li className="py-2 text-sm text-muted">Nothing here.</li>}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-sm text-muted">
        {unscheduled} lead{unscheduled === 1 ? " has" : "s have"} no follow-up date. Set one on the lead page. Appointments,
        tasks, closings, and auctions are on the{" "}
        <Link href="/calendar" className="text-primary hover:underline">
          full calendar
        </Link>
        .
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <p className="py-8 text-center text-sm text-muted">
      No leads match these filters.{" "}
      <Link href="/leads/new" className="text-primary hover:underline">
        Create one
      </Link>
      .
    </p>
  );
}
