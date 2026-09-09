import Link from "next/link";
import { toggleTaskCompleteAction } from "@/lib/modules/tasks/actions";

interface TaskRow {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueAt: Date | null;
  leadId: string | null;
  propertyId: string | null;
  lead: { contact: { firstName: string; lastName: string } } | null;
  property: { addressLine1: string } | null;
  assignedUser: { name: string } | null;
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-amber-100 text-amber-700",
  URGENT: "bg-red-100 text-red-700",
};

export function TaskList({ tasks, showEntity = true }: { tasks: TaskRow[]; showEntity?: boolean }) {
  if (tasks.length === 0) {
    return <p className="px-5 py-6 text-center text-sm text-muted">No tasks here.</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {tasks.map((task) => {
        const isDone = task.status === "COMPLETED";
        const isOverdue = !isDone && task.dueAt && task.dueAt < new Date();
        return (
          <li key={task.id} className="flex items-center gap-3 px-5 py-3 text-sm">
            <form action={toggleTaskCompleteAction}>
              <input type="hidden" name="taskId" value={task.id} />
              <input type="hidden" name="nextStatus" value={isDone ? "OPEN" : "COMPLETED"} />
              {task.leadId && <input type="hidden" name="leadId" value={task.leadId} />}
              {task.propertyId && <input type="hidden" name="propertyId" value={task.propertyId} />}
              <button
                type="submit"
                aria-label={isDone ? "Mark incomplete" : "Mark complete"}
                className={`h-4 w-4 shrink-0 rounded-sm border ${isDone ? "border-primary bg-primary" : "border-border bg-white"}`}
              />
            </form>
            <div className="min-w-0 flex-1">
              <p className={isDone ? "text-muted line-through" : "text-foreground"}>{task.title}</p>
              {showEntity && (task.lead || task.property) && (
                <p className="text-xs text-muted">
                  {task.lead && (
                    <Link href={`/leads/${task.leadId}`} className="hover:underline">
                      {task.lead.contact.firstName} {task.lead.contact.lastName}
                    </Link>
                  )}
                  {task.property && (
                    <Link href={`/properties/${task.propertyId}`} className="hover:underline">
                      {task.property.addressLine1}
                    </Link>
                  )}
                </p>
              )}
            </div>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[task.priority]}`}>
              {task.priority}
            </span>
            {task.assignedUser && <span className="w-28 shrink-0 text-xs text-muted">{task.assignedUser.name}</span>}
            <span className={`w-20 shrink-0 text-right text-xs ${isOverdue ? "font-medium text-danger" : "text-muted"}`}>
              {task.dueAt ? task.dueAt.toLocaleDateString() : "—"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
