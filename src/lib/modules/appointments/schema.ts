import { z } from "zod";

export const appointmentTypeEnum = z.enum([
  "CONSULTATION",
  "PROPERTY_WALK",
  "CLOSING",
  "COURT_DATE",
  "AUCTION",
  "OTHER",
]);

export const createAppointmentSchema = z
  .object({
    leadId: z.string().min(1),
    type: appointmentTypeEnum.default("CONSULTATION"),
    startAt: z.string().min(1, "Start time is required"),
    endAt: z.string().min(1, "End time is required"),
    location: z.string().max(200).optional().or(z.literal("")),
    notes: z.string().max(2000).optional().or(z.literal("")),
    assignedUserId: z.string().optional().or(z.literal("")),
  })
  .refine((data) => new Date(data.endAt) > new Date(data.startAt), {
    message: "End time must be after start time",
    path: ["endAt"],
  });
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
