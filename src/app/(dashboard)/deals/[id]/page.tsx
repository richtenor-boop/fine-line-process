import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { getDeal } from "@/lib/modules/deals/service";
import { setDealBuyerAction } from "@/lib/modules/deals/actions";
import { StageSelect } from "./stage-select";
import { listBuyers } from "@/lib/modules/buyers/service";
import { listDocuments } from "@/lib/modules/documents/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NotesSection } from "@/components/domain/notes-section";
import { DocumentsSection } from "@/components/domain/documents-section";
import { TransactionForm } from "./transaction-form";
import { SalePriceForm } from "./sale-price-form";

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  ACQUISITION_COST: "Acquisition cost",
  DISPOSITION_PROCEEDS: "Disposition proceeds",
  ASSIGNMENT_FEE: "Assignment fee",
  REPAIR_COST: "Repair cost",
  CLOSING_COST: "Closing cost",
  OTHER: "Other",
};

export default async function DealDetailPage({ params }: PageProps<"/deals/[id]">) {
  const { id } = await params;
  const session = await requirePermission("deals:view");

  const [deal, buyers, documents] = await Promise.all([
    getDeal(session.user.organizationId, id),
    listBuyers(session.user.organizationId),
    listDocuments(session.user.organizationId, { dealId: id }),
  ]);
  if (!deal) notFound();

  const netProceeds = deal.transactions.reduce((sum, t) => {
    const sign = t.type === "DISPOSITION_PROCEEDS" || t.type === "ASSIGNMENT_FEE" ? 1 : -1;
    return sum + sign * Number(t.amount);
  }, 0);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {deal.property?.addressLine1 ?? `${deal.lead.contact.firstName} ${deal.lead.contact.lastName}`}
          </h1>
          <Link href={`/leads/${deal.leadId}`} className="text-sm text-primary hover:underline">
            {deal.lead.contact.firstName} {deal.lead.contact.lastName}
          </Link>
        </div>
        <StageSelect dealId={deal.id} stage={deal.stage} />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Financials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <Detail label="Purchase price" value={deal.purchasePrice ? `$${Number(deal.purchasePrice).toLocaleString()}` : "—"} />
                <Detail label="Sale price" value={deal.salePrice ? `$${Number(deal.salePrice).toLocaleString()}` : "—"} />
                <Detail label="Assignment fee" value={deal.assignmentFee ? `$${Number(deal.assignmentFee).toLocaleString()}` : "—"} />
                <Detail label="Net transactions" value={`$${netProceeds.toLocaleString()}`} />
              </dl>
              <SalePriceForm
                dealId={deal.id}
                salePrice={deal.salePrice?.toString() ?? ""}
                assignmentFee={deal.assignmentFee?.toString() ?? ""}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transactions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="divide-y divide-border">
                {deal.transactions.map((t) => (
                  <li key={t.id} className="flex items-center justify-between py-2 text-sm">
                    <span>{TRANSACTION_TYPE_LABELS[t.type]}</span>
                    <span className="text-muted">
                      ${Number(t.amount).toLocaleString()} · {t.occurredOn.toLocaleDateString()}
                    </span>
                  </li>
                ))}
                {deal.transactions.length === 0 && <p className="py-2 text-sm text-muted">No transactions yet.</p>}
              </ul>
              <TransactionForm dealId={deal.id} />
            </CardContent>
          </Card>

          <DocumentsSection documents={documents} dealId={deal.id} />

          <NotesSection notes={deal.notes} dealId={deal.id} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Buyer</CardTitle>
            </CardHeader>
            <CardContent>
              {deal.buyer ? (
                <Link href={`/buyers/${deal.buyerId}`} className="text-sm text-primary hover:underline">
                  {deal.buyer.contact.firstName} {deal.buyer.contact.lastName}
                </Link>
              ) : (
                <p className="text-sm text-muted">No buyer assigned.</p>
              )}
              <form action={setDealBuyerAction} className="mt-2 space-y-2">
                <input type="hidden" name="dealId" value={deal.id} />
                <select
                  name="buyerId"
                  defaultValue={deal.buyerId ?? ""}
                  className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-sm"
                >
                  <option value="">Unassigned</option>
                  {buyers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.contact.firstName} {b.contact.lastName}
                    </option>
                  ))}
                </select>
                <Button type="submit" variant="secondary" className="w-full text-xs">
                  Update buyer
                </Button>
              </form>
            </CardContent>
          </Card>

          {deal.property && (
            <Card>
              <CardHeader>
                <CardTitle>Property</CardTitle>
              </CardHeader>
              <CardContent>
                <Link href={`/properties/${deal.propertyId}`} className="text-sm text-primary hover:underline">
                  {deal.property.addressLine1}, {deal.property.city}, {deal.property.state} {deal.property.zip}
                </Link>
              </CardContent>
            </Card>
          )}

          {deal.contract && (
            <Card>
              <CardHeader>
                <CardTitle>Contract</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted">
                <p>Status: {deal.contract.status}</p>
                <p>Offer: ${Number(deal.contract.offer.amount).toLocaleString()}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}
