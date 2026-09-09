import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  roleId: z.string().min(1, "Select a role"),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const changeUserRoleSchema = z.object({
  userId: z.string().min(1),
  roleId: z.string().min(1),
});
export type ChangeUserRoleInput = z.infer<typeof changeUserRoleSchema>;
