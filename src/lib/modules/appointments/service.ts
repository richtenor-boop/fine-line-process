import "server-only";
import { prisma } from "@/lib/db";
import type { CreateAppointmentInput } from "./schema";

export async function createAppointment(organizationId: string, createdById: string, input: CreateAppointmentInput) {
  const lead = await prisma.lead.findFirst({ where: { id: input.leadId, organizationId } });
  if (!lead) throw new Error("Lead does not belong to this organization.");

  return prisma.appointment.create({
    data: {
      organizationId,
      leadId: input.leadId,
      type: input.type,
      startAt: new Date(input.startAt),
      endAt: new Date(input.endAt),
      location: input.location || null,
      notes: input.notes || null,
      assignedUserId: input.assignedUserId || null,
      createdById,
    },
  });
}

export async function listAppointmentsForLead(organizationId: string, leadId: string) {
  return prisma.appointment.findMany({
    where: { organizationId, leadId, cancelledAt: null },
    include: { assignedUser: true },
    orderBy: { startAt: "asc" },
  });
}

export async function countAppointmentsToday(organizationId: string) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return prisma.appointment.count({
    where: { organizationId, cancelledAt: null, startAt: { gte: start, lte: end } },
  });
}

export async function cancelAppointment(organizationId: string, appointmentId: string) {
  await prisma.appointment.update({
    where: { id: appointmentId, organizationId },
    data: { cancelledAt: new Date() },
  });
}
