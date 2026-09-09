import Link from "next/link";
import { requirePermission } from "@/lib/rbac";
import { listBuyers } from "@/lib/modules/buyers/service";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function BuyersPage() {
  const session = await requirePermission("buyers:view");
  const buyers = await listBuyers(session.user.organizationId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Buyers</h1>
        <Link href="/buyers/new">
          <Button>New buyer</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-2 font-medium">Name</th>
                <th className="px-5 py-2 font-medium">Company</th>
                <th className="px-5 py-2 font-medium">Markets</th>
                <th className="px-5 py-2 font-medium">Price range</th>
                <th className="px-5 py-2 font-medium">Cash</th>
              </tr>
            </thead>
            <tbody>
              {buyers.map((buyer) => (
                <tr key={buyer.id} className="border-b border-border last:border-0 hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <Link href={`/buyers/${buyer.id}`} className="font-medium text-primary hover:underline">
                      {buyer.contact.firstName} {buyer.contact.lastName}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-muted">{buyer.companyName ?? "—"}</td>
                  <td className="px-5 py-3 text-muted">{buyer.markets.join(", ") || "—"}</td>
                  <td className="px-5 py-3 text-muted">
                    {buyer.minPrice ? `$${Number(buyer.minPrice).toLocaleString()}` : "any"} –{" "}
                    {buyer.maxPrice ? `$${Number(buyer.maxPrice).toLocaleString()}` : "any"}
                  </td>
                  <td className="px-5 py-3 text-muted">{buyer.isCashBuyer ? "Yes" : "—"}</td>
                </tr>
              ))}
              {buyers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-muted">
                    No buyers yet.{" "}
                    <Link href="/buyers/new" className="text-primary hover:underline">
                      Add one
                    </Link>
                    .
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
