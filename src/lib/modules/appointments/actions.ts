"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { createAppointment, cancelAppointment } from "./service";
import { createAppointmentSchema } from "./schema";
import { writeAuditLog } from "@/lib/audit";
import { runAutomationsForTrigger } from "@/lib/modules/automations/executor";

export interface CreateAppointmentState {
  error?: string;
}

export async function createAppointmentAction(
  _prevState: CreateAppointmentState,
  formData: FormData,
): Promise<CreateAppointmentState> {
  const session = await requirePermission("tasks:edit");

  const parsed = createAppointmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const appointment = await createAppointment(session.user.organizationId, session.user.id, parsed.data);
  await writeAuditLog({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: "appointment.scheduled",
    entityType: "Appointment",
    entityId: appointment.id,
  });
  await runAutomationsForTrigger(session.user.organizationId, "APPOINTMENT_SCHEDULED", parsed.data.leadId);

  revalidatePath(`/leads/${parsed.data.leadId}`);
  return {};
}

export async function cancelAppointmentAction(formData: FormData): Promise<void> {
  const session = await requirePermission("tasks:edit");
  const appointmentId = String(formData.get("appointmentId"));
  const leadId = String(formData.get("leadId"));

  await cancelAppointment(session.user.organizationId, appointmentId);
  revalidatePath(`/leads/${leadId}`);
}
