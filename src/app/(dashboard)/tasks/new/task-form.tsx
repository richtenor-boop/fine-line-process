"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createTaskAction, type CreateTaskState } from "@/lib/modules/tasks/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

const initialState: CreateTaskState = {};

export function TaskForm({ users }: { users: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createTaskAction, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success) router.push("/tasks");
  }, [state, router]);

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      {state.error && <Alert variant="error">{state.error}</Alert>}
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="priority">Priority</Label>
          <Select id="priority" name="priority" defaultValue="MEDIUM">
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="dueAt">Due date</Label>
          <Input id="dueAt" name="dueAt" type="date" />
        </div>
        <div className="col-span-2">
          <Label htmlFor="assignedUserId">Assign to</Label>
          <Select id="assignedUserId" name="assignedUserId" defaultValue="">
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create task"}
      </Button>
    </form>
  );
}
