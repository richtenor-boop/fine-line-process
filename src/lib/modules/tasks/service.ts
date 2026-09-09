import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type { CreateTaskInput, UpdateTaskInput, TaskView } from "./schema";

export async function createTask(organizationId: string, createdById: string, input: CreateTaskInput) {
  return prisma.task.create({
    data: {
      organizationId,
      title: input.title,
      description: input.description || null,
      leadId: input.leadId || null,
      propertyId: input.propertyId || null,
      assignedUserId: input.assignedUserId || null,
      priority: input.priority,
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
      createdById,
    },
  });
}

export async function getTask(organizationId: string, taskId: string) {
  return prisma.task.findFirst({
    where: { id: taskId, organizationId },
    include: {
      lead: { include: { contact: true } },
      property: true,
      assignedUser: true,
      notes: { include: { author: true }, orderBy: { createdAt: "desc" } },
    },
  });
}

export async function updateTask(organizationId: string, taskId: string, input: UpdateTaskInput) {
  return prisma.task.update({
    where: { id: taskId, organizationId },
    data: {
      title: input.title,
      description: input.description || null,
      assignedUserId: input.assignedUserId || null,
      priority: input.priority,
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
    },
  });
}

export async function setTaskStatus(organizationId: string, taskId: string, status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED") {
  return prisma.task.update({
    where: { id: taskId, organizationId },
    data: { status, completedAt: status === "COMPLETED" ? new Date() : null },
  });
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export async function listTasks(
  organizationId: string,
  view: TaskView,
  currentUserId: string,
  filters: { leadId?: string; propertyId?: string } = {},
) {
  const now = new Date();
  const where: Prisma.TaskWhereInput = {
    organizationId,
    ...(filters.leadId ? { leadId: filters.leadId } : {}),
    ...(filters.propertyId ? { propertyId: filters.propertyId } : {}),
  };

  switch (view) {
    case "mine":
      where.assignedUserId = currentUserId;
      where.status = { in: ["OPEN", "IN_PROGRESS"] };
      break;
    case "team":
      where.status = { in: ["OPEN", "IN_PROGRESS"] };
      break;
    case "overdue":
      where.status = { in: ["OPEN", "IN_PROGRESS"] };
      where.dueAt = { lt: startOfDay(now) };
      break;
    case "today":
      where.status = { in: ["OPEN", "IN_PROGRESS"] };
      where.dueAt = { gte: startOfDay(now), lte: endOfDay(now) };
      break;
    case "week": {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() + 7);
      where.status = { in: ["OPEN", "IN_PROGRESS"] };
      where.dueAt = { gte: startOfDay(now), lte: endOfDay(weekEnd) };
      break;
    }
    case "completed":
      where.status = "COMPLETED";
      break;
  }

  return prisma.task.findMany({
    where,
    include: { lead: { include: { contact: true } }, property: true, assignedUser: true },
    orderBy: view === "completed" ? { completedAt: "desc" } : [{ dueAt: "asc" }, { createdAt: "desc" }],
    take: 200,
  });
}

export async function countOpenTasksForUser(organizationId: string, userId: string) {
  return prisma.task.count({
    where: { organizationId, assignedUserId: userId, status: { in: ["OPEN", "IN_PROGRESS"] } },
  });
}

export async function countOverdueTasks(organizationId: string) {
  return prisma.task.count({
    where: {
      organizationId,
      status: { in: ["OPEN", "IN_PROGRESS"] },
      dueAt: { lt: startOfDay(new Date()) },
    },
  });
}
