import Link from "next/link";
import { requirePermission } from "@/lib/rbac";
import { listTasks } from "@/lib/modules/tasks/service";
import { taskViewEnum } from "@/lib/modules/tasks/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TaskList } from "@/components/domain/task-list";
import { cn } from "@/lib/cn";

const VIEWS: { key: string; label: string }[] = [
  { key: "mine", label: "My Tasks" },
  { key: "team", label: "Team Tasks" },
  { key: "overdue", label: "Overdue" },
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "completed", label: "Completed" },
];

export default async function TasksPage({ searchParams }: PageProps<"/tasks">) {
  const session = await requirePermission("tasks:view");
  const { view: rawView } = await searchParams;

  const parsedView = taskViewEnum.safeParse(rawView);
  const view = parsedView.success ? parsedView.data : "mine";

  const tasks = await listTasks(session.user.organizationId, view, session.user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Tasks</h1>
        <Link href="/tasks/new">
          <Button>New task</Button>
        </Link>
      </div>

      <div className="flex gap-1 border-b border-border">
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={`/tasks?view=${v.key}`}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium",
              view === v.key ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground",
            )}
          >
            {v.label}
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <TaskList tasks={tasks} />
        </CardContent>
      </Card>
    </div>
  );
}
