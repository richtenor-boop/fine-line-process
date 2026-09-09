import { requirePermission } from "@/lib/rbac";
import { listUsers } from "@/lib/modules/users/service";
import { TaskForm } from "./task-form";

export default async function NewTaskPage() {
  const session = await requirePermission("tasks:edit");
  const users = await listUsers(session.user.organizationId);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground">New task</h1>
      <TaskForm users={users.map((u) => ({ id: u.id, name: u.name }))} />
    </div>
  );
}
