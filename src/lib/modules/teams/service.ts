import "server-only";
import { prisma } from "@/lib/db";

export async function listTeams(organizationId: string) {
  return prisma.team.findMany({
    where: { organizationId },
    include: { members: { include: { user: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createTeam(organizationId: string, name: string) {
  return prisma.team.create({ data: { organizationId, name } });
}

export async function addTeamMember(organizationId: string, teamId: string, userId: string) {
  const [team, user] = await Promise.all([
    prisma.team.findFirst({ where: { id: teamId, organizationId } }),
    prisma.user.findFirst({ where: { id: userId, organizationId } }),
  ]);
  if (!team || !user) throw new Error("Team or user does not belong to this organization.");

  return prisma.teamMember.upsert({
    where: { teamId_userId: { teamId, userId } },
    update: {},
    create: { teamId, userId },
  });
}

export async function removeTeamMember(organizationId: string, teamId: string, userId: string) {
  const team = await prisma.team.findFirst({ where: { id: teamId, organizationId } });
  if (!team) throw new Error("Team does not belong to this organization.");
  await prisma.teamMember.deleteMany({ where: { teamId, userId } });
}

export async function deleteTeam(organizationId: string, teamId: string) {
  const team = await prisma.team.findFirst({ where: { id: teamId, organizationId } });
  if (!team) throw new Error("Team does not belong to this organization.");
  await prisma.team.delete({ where: { id: teamId } });
}
