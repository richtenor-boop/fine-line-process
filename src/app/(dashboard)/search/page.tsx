import Link from "next/link";
import { requireSession, currentUserHasPermission } from "@/lib/rbac";
import { globalSearch } from "@/lib/modules/search/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const session = await requireSession();
  const params = await searchParams;
  const q = first(params.q);

  const [canViewLeads, canViewProperties, canViewDeals, canViewDocuments] = await Promise.all([
    currentUserHasPermission("leads:view"),
    currentUserHasPermission("properties:view"),
    currentUserHasPermission("deals:view"),
    currentUserHasPermission("documents:view"),
  ]);

  const results = q
    ? await globalSearch(session.user.organizationId, q, {
        leads: canViewLeads,
        properties: canViewProperties,
        deals: canViewDeals,
        documents: canViewDocuments,
      })
    : { leads: [], properties: [], deals: [], documents: [] };

  const totalResults = results.leads.length + results.properties.length + results.deals.length + results.documents.length;

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Search</h1>

      <form action="/search" className="flex gap-2">
        <Input name="q" defaultValue={q} placeholder="Search people, addresses, phone, email, parcel #, documents..." autoFocus />
        <Button type="submit">Search</Button>
      </form>

      {q && totalResults === 0 && <p className="text-sm text-muted">No results for &quot;{q}&quot;.</p>}

      {results.leads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Leads ({results.leads.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {results.leads.map((lead) => (
              <Link key={lead.id} href={`/leads/${lead.id}`} className="block text-sm hover:bg-slate-50 rounded-md p-2 -m-2">
                <span className="font-medium text-foreground">
                  {lead.contact.firstName} {lead.contact.lastName}
                </span>
                {lead.property && <span className="text-muted"> · {lead.property.addressLine1}</span>}
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-foreground">
                  {lead.stage.name}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {results.properties.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Properties ({results.properties.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {results.properties.map((property) => (
              <Link
                key={property.id}
                href={`/properties/${property.id}`}
                className="block text-sm hover:bg-slate-50 rounded-md p-2 -m-2"
              >
                <span className="font-medium text-foreground">{property.addressLine1}</span>
                <span className="text-muted">
                  {" "}
                  · {property.city}, {property.state} {property.zip}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {results.deals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Deals ({results.deals.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {results.deals.map((deal) => (
              <Link key={deal.id} href={`/deals/${deal.id}`} className="block text-sm hover:bg-slate-50 rounded-md p-2 -m-2">
                <span className="font-medium text-foreground">
                  {deal.property?.addressLine1 ?? `${deal.lead.contact.firstName} ${deal.lead.contact.lastName}`}
                </span>
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-foreground">
                  {deal.stage.replace(/_/g, " ")}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {results.documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Documents ({results.documents.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {results.documents.map((doc) => (
              <a
                key={doc.id}
                href={`/api/documents/${doc.id}`}
                target="_blank"
                rel="noreferrer"
                className="block text-sm hover:bg-slate-50 rounded-md p-2 -m-2"
              >
                <span className="font-medium text-foreground">{doc.fileName}</span>
              </a>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
