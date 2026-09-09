import Link from "next/link";
import { listOffersForLead, getDealIdForLead } from "@/lib/modules/deals/service";
import {
  updateOfferStatusAction,
  createContractAction,
  updateContractStatusAction,
  createDealAction,
} from "@/lib/modules/deals/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OfferForm } from "./offer-form";

export async function DealSection({ organizationId, leadId }: { organizationId: string; leadId: string }) {
  const [offers, existingDealId] = await Promise.all([
    listOffersForLead(organizationId, leadId),
    getDealIdForLead(organizationId, leadId),
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Offers &amp; contract</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {existingDealId && (
          <Link href={`/deals/${existingDealId}`} className="block text-sm font-medium text-primary hover:underline">
            View deal →
          </Link>
        )}

        <ul className="space-y-3">
          {offers.map((offer) => (
            <li key={offer.id} className="rounded-md border border-border p-3 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium text-foreground">${Number(offer.amount).toLocaleString()}</p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-foreground">
                  {offer.status}
                </span>
              </div>
              {offer.notes && <p className="mt-1 text-xs text-muted">{offer.notes}</p>}

              {offer.status !== "ACCEPTED" && offer.status !== "REJECTED" && offer.status !== "WITHDRAWN" && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {(["SENT", "COUNTERED", "ACCEPTED", "REJECTED", "WITHDRAWN"] as const).map((status) => (
                    <form key={status} action={updateOfferStatusAction}>
                      <input type="hidden" name="offerId" value={offer.id} />
                      <input type="hidden" name="leadId" value={leadId} />
                      <input type="hidden" name="status" value={status} />
                      <Button type="submit" variant="ghost" className="text-xs">
                        Mark {status.toLowerCase()}
                      </Button>
                    </form>
                  ))}
                </div>
              )}

              {offer.status === "ACCEPTED" && !offer.contract && (
                <form action={createContractAction} className="mt-2">
                  <input type="hidden" name="offerId" value={offer.id} />
                  <input type="hidden" name="leadId" value={leadId} />
                  <Button type="submit" variant="secondary" className="text-xs">
                    Create contract
                  </Button>
                </form>
              )}

              {offer.contract && (
                <div className="mt-2 flex items-center gap-2 border-t border-border pt-2">
                  <span className="text-xs text-muted">Contract: {offer.contract.status}</span>
                  {offer.contract.status !== "SIGNED" && offer.contract.status !== "VOIDED" && (
                    <form action={updateContractStatusAction}>
                      <input type="hidden" name="contractId" value={offer.contract.id} />
                      <input type="hidden" name="leadId" value={leadId} />
                      <input type="hidden" name="status" value="SIGNED" />
                      <Button type="submit" variant="ghost" className="text-xs">
                        Mark signed
                      </Button>
                    </form>
                  )}
                  {offer.contract.status === "SIGNED" && !existingDealId && (
                    <form action={createDealAction}>
                      <input type="hidden" name="contractId" value={offer.contract.id} />
                      <input type="hidden" name="leadId" value={leadId} />
                      <Button type="submit" variant="secondary" className="text-xs">
                        Create deal
                      </Button>
                    </form>
                  )}
                </div>
              )}
            </li>
          ))}
          {offers.length === 0 && <p className="text-sm text-muted">No offers yet.</p>}
        </ul>

        <OfferForm leadId={leadId} />
      </CardContent>
    </Card>
  );
}
