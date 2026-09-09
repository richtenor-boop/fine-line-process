import type { CommunicationEvent } from "@/lib/modules/communications/service";
import { cn } from "@/lib/cn";

const ICON: Record<CommunicationEvent["kind"], string> = { call: "📞", sms: "💬", email: "✉️" };

export function Thread({ events }: { events: CommunicationEvent[] }) {
  if (events.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">No communications yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {events.map((event, i) => (
        <li
          key={i}
          className={cn(
            "max-w-lg rounded-lg border border-border p-3 text-sm",
            event.direction === "OUTBOUND" ? "ml-auto bg-blue-50" : "bg-white",
          )}
        >
          <p className="text-xs text-muted">
            {ICON[event.kind]} {event.direction === "OUTBOUND" ? "You" : "Them"} · {event.at.toLocaleString()}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-foreground">{event.summary}</p>
          {event.detail && <p className="mt-1 text-xs text-muted">{event.detail}</p>}
        </li>
      ))}
    </ul>
  );
}
