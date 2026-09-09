import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { getBuyer } from "@/lib/modules/buyers/service";
import { deleteBuyerAction } from "@/lib/modules/buyers/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function BuyerDetailPage({ params }: PageProps<"/buyers/[id]">) {
  const { id } = await params;
  const session = await requirePermission("buyers:view");

  const buyer = await getBuyer(session.user.organizationId, id);
  if (!buyer) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {buyer.contact.firstName} {buyer.contact.lastName}
          </h1>
          {buyer.companyName && <p className="text-sm text-muted">{buyer.companyName}</p>}
        </div>
        <form action={deleteBuyerAction}>
          <input type="hidden" name="buyerId" value={buyer.id} />
          <Button type="submit" variant="ghost" className="text-danger">
            Delete
          </Button>
        </form>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {buyer.contact.phoneNumbers.map((p) => (
            <p key={p.id}>{p.number}</p>
          ))}
          {buyer.contact.emailAddresses.map((e) => (
            <p key={e.id}>{e.email}</p>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Buying criteria</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Detail label="Strategy" value={buyer.strategy ?? "Unspecified"} />
            <Detail label="Cash buyer" value={buyer.isCashBuyer ? "Yes" : "No"} />
            <Detail label="Markets" value={buyer.markets.join(", ") || "Any"} />
            <Detail label="ZIP codes" value={buyer.zipCodes.join(", ") || "Any"} />
            <Detail label="Property types" value={buyer.propertyTypes.join(", ") || "Any"} />
            <Detail label="Min bedrooms" value={buyer.minBedrooms ?? "Any"} />
            <Detail
              label="Price range"
              value={`${buyer.minPrice ? `$${Number(buyer.minPrice).toLocaleString()}` : "any"} – ${buyer.maxPrice ? `$${Number(buyer.maxPrice).toLocaleString()}` : "any"}`}
            />
            <Detail
              label="Max rehab budget"
              value={buyer.maxRehabBudget ? `$${Number(buyer.maxRehabBudget).toLocaleString()}` : "Any"}
            />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Deals</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1">
            {buyer.deals.map((deal) => (
              <li key={deal.id}>
                <Link href={`/deals/${deal.id}`} className="text-sm text-primary hover:underline">
                  {deal.property?.addressLine1 ?? "Deal"} — {deal.stage.replace(/_/g, " ")}
                </Link>
              </li>
            ))}
            {buyer.deals.length === 0 && <p className="text-sm text-muted">No deals yet.</p>}
          </ul>
        </CardContent>
      </Card>
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
