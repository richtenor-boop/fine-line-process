import Link from "next/link";
import { requirePermission } from "@/lib/rbac";
import { REPORT_DEFINITIONS } from "@/lib/modules/reports/schema";
import { Card, CardContent } from "@/components/ui/card";

export default async function ReportsPage() {
  await requirePermission("reports:view");

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Reports</h1>
      <div className="grid grid-cols-2 gap-4">
        {REPORT_DEFINITIONS.map((report) => (
          <Link key={report.key} href={`/reports/${report.key}`}>
            <Card className="h-full transition-colors hover:border-primary">
              <CardContent className="pt-5">
                <p className="font-medium text-foreground">{report.label}</p>
                <p className="mt-1 text-sm text-muted">{report.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
