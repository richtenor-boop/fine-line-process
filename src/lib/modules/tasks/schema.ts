import { z } from "zod";

export const taskPriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional().or(z.literal("")),
  leadId: z.string().optional().or(z.literal("")),
  propertyId: z.string().optional().or(z.literal("")),
  assignedUserId: z.string().optional().or(z.literal("")),
  priority: taskPriorityEnum.default("MEDIUM"),
  dueAt: z.string().optional().or(z.literal("")),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().or(z.literal("")),
  assignedUserId: z.string().optional().or(z.literal("")),
  priority: taskPriorityEnum,
  dueAt: z.string().optional().or(z.literal("")),
});
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const taskViewEnum = z.enum(["mine", "team", "overdue", "today", "week", "completed"]);
export type TaskView = z.infer<typeof taskViewEnum>;
