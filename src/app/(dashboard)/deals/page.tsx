import Link from "next/link";
import { requirePermission } from "@/lib/rbac";
import { listDeals } from "@/lib/modules/deals/service";
import { DEAL_STAGE_LABELS } from "@/lib/modules/deals/schema";
import { Card, CardContent } from "@/components/ui/card";
import type { DealStage } from "@prisma/client";

export default async function DealsPage() {
  const session = await requirePermission("deals:view");
  const deals = await listDeals(session.user.organizationId);

  const stageOrder = Object.keys(DEAL_STAGE_LABELS) as DealStage[];
  const grouped = stageOrder.map((stage) => ({ stage, deals: deals.filter((d) => d.stage === stage) }));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Deals</h1>

      <div className="space-y-4">
        {grouped
          .filter((g) => g.deals.length > 0)
          .map((group) => (
            <Card key={group.stage}>
              <CardContent className="p-0">
                <p className="border-b border-border px-5 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  {DEAL_STAGE_LABELS[group.stage]} ({group.deals.length})
                </p>
                <ul className="divide-y divide-border">
                  {group.deals.map((deal) => (
                    <li key={deal.id}>
                      <Link href={`/deals/${deal.id}`} className="flex items-center justify-between px-5 py-3 text-sm hover:bg-slate-50">
                        <div>
                          <p className="font-medium text-foreground">
                            {deal.property?.addressLine1 ?? `${deal.lead.contact.firstName} ${deal.lead.contact.lastName}`}
                          </p>
                          <p className="text-xs text-muted">
                            {deal.lead.contact.firstName} {deal.lead.contact.lastName}
                            {deal.buyer && ` · Buyer: ${deal.buyer.contact.firstName} ${deal.buyer.contact.lastName}`}
                          </p>
                        </div>
                        <p className="text-sm text-muted">
                          {deal.purchasePrice ? `$${Number(deal.purchasePrice).toLocaleString()}` : "—"}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        {deals.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted">
              No deals yet — create one from a lead once its offer contract is signed.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
