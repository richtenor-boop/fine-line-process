import Link from "next/link";
import { requirePermission } from "@/lib/rbac";
import { listAllDocuments } from "@/lib/modules/documents/service";
import { DOCUMENT_CATEGORY_LABELS, documentCategoryEnum } from "@/lib/modules/documents/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import type { DocumentCategory } from "@prisma/client";

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function DocumentsPage({ searchParams }: PageProps<"/documents">) {
  const session = await requirePermission("documents:view");
  const params = await searchParams;
  const categoryParam = first(params.category);
  const category = documentCategoryEnum.safeParse(categoryParam).success ? (categoryParam as DocumentCategory) : undefined;

  const documents = await listAllDocuments(session.user.organizationId, category);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Documents</h1>
        <form action="/documents">
          <Select name="category" defaultValue={category ?? ""} className="h-8 text-sm">
            <option value="">All categories</option>
            {Object.entries(DOCUMENT_CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </form>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-2 font-medium">File</th>
                <th className="px-5 py-2 font-medium">Category</th>
                <th className="px-5 py-2 font-medium">Attached to</th>
                <th className="px-5 py-2 font-medium">Uploaded by</th>
                <th className="px-5 py-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => {
                const attachedTo = doc.lead
                  ? { label: `${doc.lead.contact.firstName} ${doc.lead.contact.lastName}`, href: `/leads/${doc.leadId}` }
                  : doc.property
                    ? { label: doc.property.addressLine1, href: `/properties/${doc.propertyId}` }
                    : doc.deal
                      ? { label: doc.deal.property?.addressLine1 ?? "Deal", href: `/deals/${doc.dealId}` }
                      : null;
                return (
                  <tr key={doc.id} className="border-b border-border last:border-0 hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <a href={`/api/documents/${doc.id}`} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                        {doc.fileName}
                      </a>
                    </td>
                    <td className="px-5 py-3 text-muted">{DOCUMENT_CATEGORY_LABELS[doc.category]}</td>
                    <td className="px-5 py-3 text-muted">
                      {attachedTo ? (
                        <Link href={attachedTo.href} className="hover:underline">
                          {attachedTo.label}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3 text-muted">{doc.uploadedByUser?.name ?? "—"}</td>
                    <td className="px-5 py-3 whitespace-nowrap text-muted">{doc.createdAt.toLocaleDateString()}</td>
                  </tr>
                );
              })}
              {documents.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-muted">
                    No documents yet.
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
