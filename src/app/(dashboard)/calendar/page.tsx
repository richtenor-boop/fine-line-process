import Link from "next/link";
import { requirePermission } from "@/lib/rbac";
import { getCalendarEvents } from "@/lib/modules/calendar/service";
import { Card, CardContent } from "@/components/ui/card";

const KIND_COLORS: Record<string, string> = {
  appointment: "bg-blue-100 text-blue-700",
  task: "bg-amber-100 text-amber-700",
  closing: "bg-green-100 text-green-700",
  auction: "bg-red-100 text-red-700",
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const session = await requirePermission("tasks:view");
  const params = await searchParams;

  const now = new Date();
  const year = Number(first(params.year)) || now.getFullYear();
  const month = Number(first(params.month)) || now.getMonth() + 1; // 1-indexed

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
  const events = await getCalendarEvents(session.user.organizationId, monthStart, monthEnd);

  const eventsByDay = new Map<number, typeof events>();
  for (const event of events) {
    if (event.date.getMonth() !== monthStart.getMonth()) continue;
    const day = event.date.getDate();
    eventsByDay.set(day, [...(eventsByDay.get(day) ?? []), event]);
  }

  const firstWeekday = monthStart.getDay(); // 0 = Sunday
  const daysInMonth = monthEnd.getDate();
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  const monthLabel = monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">{monthLabel}</h1>
        <div className="flex gap-2 text-sm">
          <Link href={`/calendar?year=${prevMonth.year}&month=${prevMonth.month}`} className="text-primary hover:underline">
            ← Prev
          </Link>
          <Link href={`/calendar?year=${now.getFullYear()}&month=${now.getMonth() + 1}`} className="text-primary hover:underline">
            Today
          </Link>
          <Link href={`/calendar?year=${nextMonth.year}&month=${nextMonth.month}`} className="text-primary hover:underline">
            Next →
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-7 border-b border-border text-center text-xs font-semibold uppercase tracking-wide text-muted">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((day, i) => (
              <div key={i} className="min-h-24 border-b border-r border-border p-1 last:border-r-0">
                {day && (
                  <>
                    <p className="text-xs text-muted">{day}</p>
                    <div className="space-y-0.5">
                      {(eventsByDay.get(day) ?? []).slice(0, 3).map((event, j) => (
                        <Link
                          key={j}
                          href={event.href}
                          className={`block truncate rounded px-1 py-0.5 text-[10px] font-medium ${KIND_COLORS[event.kind]}`}
                          title={event.label}
                        >
                          {event.label}
                        </Link>
                      ))}
                      {(eventsByDay.get(day)?.length ?? 0) > 3 && (
                        <p className="px-1 text-[10px] text-muted">+{eventsByDay.get(day)!.length - 3} more</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted">
        External two-way sync (Google/Microsoft Calendar) is a documented future integration — see
        docs/06-integrations.md.
      </p>
    </div>
  );
}
