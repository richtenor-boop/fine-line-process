import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission, currentUserHasPermission } from "@/lib/rbac";
import { getProperty } from "@/lib/modules/properties/service";
import { listCustomFieldDefinitions } from "@/lib/modules/custom-fields/service";
import { listTasks } from "@/lib/modules/tasks/service";
import { listDocuments } from "@/lib/modules/documents/service";
import { findMatchingBuyers } from "@/lib/modules/buyers/service";
import { getPropertyDetails } from "@/lib/modules/property-details/service";
import { getDealAnalysis } from "@/lib/modules/deal-analyzer/service";
import { listMediaLinks } from "@/lib/modules/media-links/service";
import { listGeneratedContracts } from "@/lib/modules/contract-generator/service";
import { MediaLinksSection } from "@/components/domain/media-links-section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotesSection } from "@/components/domain/notes-section";
import { CustomFieldsSection } from "@/components/domain/custom-fields-section";
import { TaskList } from "@/components/domain/task-list";
import { QuickTaskForm } from "@/components/domain/quick-task-form";
import { DocumentsSection } from "@/components/domain/documents-section";
import { PropertyDetailsSection } from "@/components/domain/property-details-section";
import { DealAnalyzerSection } from "@/components/domain/deal-analyzer-section";
import { removeOwnerAction } from "./actions";
import { AddOwnerForm } from "./add-owner-form";
import { Button } from "@/components/ui/button";

export default async function PropertyDetailPage({ params }: PageProps<"/properties/[id]">) {
  const { id } = await params;
  const session = await requirePermission("properties:view");

  const [
    property,
    customFieldDefinitions,
    tasks,
    documents,
    matchingBuyers,
    propertyDetails,
    dealAnalysis,
    canEditProperty,
    mediaLinks,
    contracts,
    canEditDeals,
  ] = await Promise.all([
    getProperty(session.user.organizationId, id),
    listCustomFieldDefinitions(session.user.organizationId, "PROPERTY"),
    listTasks(session.user.organizationId, "team", session.user.id, { propertyId: id }),
    listDocuments(session.user.organizationId, { propertyId: id }),
    findMatchingBuyers(session.user.organizationId, id),
    getPropertyDetails(session.user.organizationId, id),
    getDealAnalysis(session.user.organizationId, id),
    currentUserHasPermission("properties:edit"),
    listMediaLinks(session.user.organizationId, { propertyId: id }),
    listGeneratedContracts(session.user.organizationId, id),
    currentUserHasPermission("deals:edit"),
  ]);
  if (!property) notFound();

  const customFieldValues = Object.fromEntries(property.customFieldValues.map((v) => [v.definitionId, v.value ?? ""]));

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{property.addressLine1}</h1>
        <p className="text-sm text-muted">
          {property.city}, {property.state} {property.zip} {property.county && `· ${property.county} County`}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Property details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <Detail label="Type" value={property.propertyType.replace(/_/g, " ")} />
                <Detail label="Bedrooms" value={property.bedrooms ?? "—"} />
                <Detail label="Bathrooms" value={property.bathrooms ?? "—"} />
                <Detail label="Square feet" value={property.squareFeet?.toLocaleString() ?? "—"} />
                <Detail label="Year built" value={property.yearBuilt ?? "—"} />
                <Detail
                  label="Estimated value"
                  value={property.estimatedValue ? `$${Number(property.estimatedValue).toLocaleString()}` : "—"}
                />
                <Detail
                  label="Mortgage balance"
                  value={property.mortgageBalance ? `$${Number(property.mortgageBalance).toLocaleString()}` : "—"}
                />
                <Detail
                  label="Estimated equity"
                  value={property.estimatedEquity ? `$${Number(property.estimatedEquity).toLocaleString()}` : "—"}
                />
              </dl>
              <div className="mt-4 border-t border-border pt-4">
                <CustomFieldsSection
                  entityType="PROPERTY"
                  entityId={property.id}
                  definitions={customFieldDefinitions}
                  values={customFieldValues}
                />
              </div>
            </CardContent>
          </Card>

          {dealAnalysis && (
            <DealAnalyzerSection
              propertyId={property.id}
              initialInputs={dealAnalysis.inputs}
              saved={dealAnalysis.saved}
              canEdit={canEditProperty}
            />
          )}

          <Card>
            <CardHeader>
              <CardTitle>Tasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <QuickTaskForm propertyId={property.id} />
              <div className="-mx-5">
                <TaskList tasks={tasks} showEntity={false} />
              </div>
            </CardContent>
          </Card>

          <MediaLinksSection links={mediaLinks} propertyId={property.id} canEdit={canEditProperty} />

          <DocumentsSection documents={documents} propertyId={property.id} />

          <PropertyDetailsSection propertyId={property.id} details={propertyDetails} />

          <NotesSection notes={property.notes} propertyId={property.id} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex items-center justify-between gap-2">
              <CardTitle>Contracts</CardTitle>
              {canEditDeals && (
                <Link href={`/properties/${property.id}/contracts/new`} className="text-xs font-medium text-primary hover:underline">
                  + Generate
                </Link>
              )}
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {contracts.map((c) => (
                  <li key={c.id} className="text-sm">
                    <Link href={`/contracts/${c.id}`} className="text-primary hover:underline">
                      {c.title}
                    </Link>
                    <span className="block text-xs text-muted">{c.createdAt.toLocaleDateString()}</span>
                  </li>
                ))}
                {contracts.length === 0 && (
                  <p className="text-sm text-muted">Cash, novation, and Subject-To agreements, prefilled from this property.</p>
                )}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Owners</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2">
                {property.owners.map((owner) => (
                  <li key={owner.id} className="text-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-foreground">
                          {owner.contact.firstName} {owner.contact.lastName}
                        </p>
                        {owner.contact.phoneNumbers[0] && (
                          <p className="text-xs text-muted">{owner.contact.phoneNumbers[0].number}</p>
                        )}
                        {owner.contact.emailAddresses[0] && (
                          <p className="text-xs text-muted">{owner.contact.emailAddresses[0].email}</p>
                        )}
                      </div>
                      <form action={removeOwnerAction}>
                        <input type="hidden" name="propertyId" value={property.id} />
                        <input type="hidden" name="propertyOwnerId" value={owner.id} />
                        <Button type="submit" variant="ghost" className="text-xs">
                          Remove
                        </Button>
                      </form>
                    </div>
                  </li>
                ))}
                {property.owners.length === 0 && <p className="text-sm text-muted">No owners on record.</p>}
              </ul>
              <AddOwnerForm propertyId={property.id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Leads on this property</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {property.leads.map((lead) => (
                  <li key={lead.id}>
                    <Link href={`/leads/${lead.id}`} className="text-sm text-primary hover:underline">
                      {lead.stage.name}
                    </Link>
                  </li>
                ))}
                {property.leads.length === 0 && <p className="text-sm text-muted">No leads yet.</p>}
              </ul>
            </CardContent>
          </Card>

          {matchingBuyers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Matching buyers</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {matchingBuyers.map((buyer) => (
                    <li key={buyer.id}>
                      <Link href={`/buyers/${buyer.id}`} className="text-sm text-primary hover:underline">
                        {buyer.contact.firstName} {buyer.contact.lastName}
                        {buyer.companyName && ` (${buyer.companyName})`}
                      </Link>
                    </li>
                  ))}
                </ul>
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
