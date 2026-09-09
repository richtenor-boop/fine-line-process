import Link from "next/link";
import { requirePermission } from "@/lib/rbac";
import { listProperties, type ListPropertiesFilters } from "@/lib/modules/properties/service";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function PropertiesPage({ searchParams }: PageProps<"/properties">) {
  const session = await requirePermission("properties:view");
  const params = await searchParams;

  const filters: ListPropertiesFilters = {
    state: first(params.state) || undefined,
    county: first(params.county) || undefined,
    city: first(params.city) || undefined,
    zip: first(params.zip) || undefined,
    propertyType: (first(params.propertyType) || undefined) as ListPropertiesFilters["propertyType"],
    minEquity: first(params.minEquity) ? Number(first(params.minEquity)) : undefined,
    caseType: (first(params.caseType) || undefined) as ListPropertiesFilters["caseType"],
  };

  const properties = await listProperties(session.user.organizationId, filters);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Properties</h1>
        <Link href="/properties/new">
          <Button>New property</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-5">
          <form className="grid grid-cols-2 gap-3 sm:grid-cols-6" action="/properties">
            <Input name="state" placeholder="State" defaultValue={filters.state ?? ""} className="h-8 text-sm" />
            <Input name="county" placeholder="County" defaultValue={filters.county ?? ""} className="h-8 text-sm" />
            <Input name="city" placeholder="City" defaultValue={filters.city ?? ""} className="h-8 text-sm" />
            <Input name="zip" placeholder="ZIP" defaultValue={filters.zip ?? ""} className="h-8 text-sm" />
            <Select name="propertyType" defaultValue={filters.propertyType ?? ""} className="h-8 text-sm">
              <option value="">Any type</option>
              <option value="SINGLE_FAMILY">Single Family</option>
              <option value="MULTI_FAMILY">Multi Family</option>
              <option value="CONDO">Condo</option>
              <option value="TOWNHOME">Townhome</option>
              <option value="MOBILE_HOME">Mobile Home</option>
              <option value="LAND">Land</option>
              <option value="COMMERCIAL">Commercial</option>
              <option value="OTHER">Other</option>
            </Select>
            <Select name="caseType" defaultValue={filters.caseType ?? ""} className="h-8 text-sm">
              <option value="">Any case type</option>
              <option value="FORECLOSURE">Foreclosure</option>
              <option value="TAX_SALE">Tax sale</option>
              <option value="PROBATE">Probate</option>
              <option value="SHORT_SALE">Short sale</option>
            </Select>
            <Input
              name="minEquity"
              type="number"
              placeholder="Min. equity ($)"
              defaultValue={filters.minEquity ?? ""}
              className="h-8 text-sm"
            />
            <div className="flex gap-2">
              <Button type="submit" variant="secondary" className="text-xs">
                Apply filters
              </Button>
              <Link href="/properties" className="self-center text-xs text-muted hover:underline">
                Clear
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-2 font-medium">Address</th>
                <th className="px-5 py-2 font-medium">City / State</th>
                <th className="px-5 py-2 font-medium">Type</th>
                <th className="px-5 py-2 font-medium">Owner(s)</th>
                <th className="px-5 py-2 font-medium">Est. Value</th>
                <th className="px-5 py-2 font-medium">Equity</th>
                <th className="px-5 py-2 font-medium">Case</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((property) => {
                const caseBadge = property.foreclosure
                  ? "Foreclosure"
                  : property.taxSale
                    ? "Tax sale"
                    : property.probateCase
                      ? "Probate"
                      : property.shortSale
                        ? "Short sale"
                        : null;
                return (
                <tr key={property.id} className="border-b border-border last:border-0 hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <Link href={`/properties/${property.id}`} className="font-medium text-primary hover:underline">
                      {property.addressLine1}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-muted">
                    {property.city}, {property.state} {property.zip}
                  </td>
                  <td className="px-5 py-3 text-muted">{property.propertyType.replace(/_/g, " ")}</td>
                  <td className="px-5 py-3 text-muted">
                    {property.owners.map((o) => `${o.contact.firstName} ${o.contact.lastName}`).join(", ") || "—"}
                  </td>
                  <td className="px-5 py-3 text-muted">
                    {property.estimatedValue ? `$${Number(property.estimatedValue).toLocaleString()}` : "—"}
                  </td>
                  <td className="px-5 py-3 text-muted">
                    {property.estimatedEquity ? `$${Number(property.estimatedEquity).toLocaleString()}` : "—"}
                  </td>
                  <td className="px-5 py-3">
                    {caseBadge ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">{caseBadge}</span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                </tr>
                );
              })}
              {properties.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-muted">
                    No properties match these filters.{" "}
                    <Link href="/properties/new" className="text-primary hover:underline">
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
