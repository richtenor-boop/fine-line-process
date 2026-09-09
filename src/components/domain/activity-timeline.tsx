import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActivityEvent } from "@/lib/modules/activity/service";

function describe(event: ActivityEvent): string {
  switch (event.kind) {
    case "stage_change":
      return event.fromStageName
        ? `Stage changed from "${event.fromStageName}" to "${event.toStageName}"`
        : `Entered pipeline at "${event.toStageName}"`;
    case "note":
      return `${event.authorName} added a note: "${event.body.length > 80 ? event.body.slice(0, 80) + "…" : event.body}"`;
    case "task_created":
      return `Task created: "${event.title}"${event.assignedToName ? ` (assigned to ${event.assignedToName})` : ""}`;
    case "task_completed":
      return `Task completed: "${event.title}"`;
    case "appointment_scheduled":
      return `${event.appointmentType.replace(/_/g, " ").toLowerCase()} scheduled for ${event.startAt.toLocaleString()}`;
    case "call":
      return `${event.direction === "OUTBOUND" ? "Outbound" : "Inbound"} call${event.disposition ? ` — ${event.disposition.replace(/_/g, " ").toLowerCase()}` : ""}`;
    case "sms":
      return `${event.direction === "OUTBOUND" ? "SMS sent" : "SMS received"}: "${event.body.length > 80 ? event.body.slice(0, 80) + "…" : event.body}"`;
    case "email":
      return `${event.direction === "OUTBOUND" ? "Email sent" : "Email received"}: ${event.subject ?? "(no subject)"}`;
  }
}

export function ActivityTimeline({ events }: { events: ActivityEvent[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {events.map((event, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
              <div>
                <p className="text-foreground">{describe(event)}</p>
                <p className="text-xs text-muted">{event.at.toLocaleString()}</p>
              </div>
            </li>
          ))}
          {events.length === 0 && <p className="text-sm text-muted">No activity yet.</p>}
        </ul>
        <p className="mt-4 border-t border-border pt-3 text-xs text-muted">
          Offers and documents join this feed in Phase 7; automation runs in Phase 6 — see
          docs/05-mvp-plan.md.
        </p>
      </CardContent>
    </Card>
  );
}
