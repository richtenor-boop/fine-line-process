import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { processDueCampaignEnrollments } from "@/lib/modules/campaigns/service";

/**
 * Target for an external scheduler (Vercel Cron, a hosting platform's cron job, GitHub Actions on
 * a schedule, etc.) — this sandbox has no cron infrastructure of its own to configure one against,
 * same category of gap as Phase 7 needing a real S3 bucket. The processing logic itself is real
 * and fully testable today via the manual "Process now" button in Settings > Campaigns.
 *
 * Protect by setting CRON_SECRET and having the scheduler send it as `Authorization: Bearer <secret>`.
 * Without CRON_SECRET configured, this route refuses all requests — never runs unauthenticated.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 503 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizations = await prisma.organization.findMany({ select: { id: true } });
  const results = [];
  for (const org of organizations) {
    const owner = await prisma.user.findFirst({ where: { organizationId: org.id, status: "ACTIVE" }, orderBy: { createdAt: "asc" } });
    if (!owner) continue;
    const result = await processDueCampaignEnrollments(org.id, owner.id);
    results.push({ organizationId: org.id, ...result });
  }

  return NextResponse.json({ organizations: results.length, results });
}
