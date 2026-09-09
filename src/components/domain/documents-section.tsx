import { deleteDocumentAction } from "@/lib/modules/documents/actions";
import { DOCUMENT_CATEGORY_LABELS } from "@/lib/modules/documents/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadForm } from "./upload-form";
import { Button } from "@/components/ui/button";

interface DocumentRow {
  id: string;
  fileName: string;
  category: keyof typeof DOCUMENT_CATEGORY_LABELS;
  sizeBytes: number | null;
  createdAt: Date;
  uploadedByUser: { name: string } | null;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsSection({
  documents,
  leadId,
  propertyId,
  dealId,
}: {
  documents: DocumentRow[];
  leadId?: string;
  propertyId?: string;
  dealId?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <UploadForm leadId={leadId} propertyId={propertyId} dealId={dealId} />

        <ul className="divide-y divide-border">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <div className="min-w-0">
                <a href={`/api/documents/${doc.id}`} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                  {doc.fileName}
                </a>
                <p className="text-xs text-muted">
                  {DOCUMENT_CATEGORY_LABELS[doc.category]} · {formatSize(doc.sizeBytes)} · {doc.uploadedByUser?.name ?? "Unknown"} ·{" "}
                  {doc.createdAt.toLocaleDateString()}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <a href={`/api/documents/${doc.id}?download=1`} className="text-xs text-primary hover:underline">
                  Download
                </a>
                <form action={deleteDocumentAction}>
                  <input type="hidden" name="documentId" value={doc.id} />
                  {leadId && <input type="hidden" name="leadId" value={leadId} />}
                  {propertyId && <input type="hidden" name="propertyId" value={propertyId} />}
                  {dealId && <input type="hidden" name="dealId" value={dealId} />}
                  <Button type="submit" variant="ghost" className="text-xs text-danger">
                    Delete
                  </Button>
                </form>
              </div>
            </li>
          ))}
          {documents.length === 0 && <li className="py-4 text-center text-sm text-muted">No documents yet.</li>}
        </ul>
      </CardContent>
    </Card>
  );
}
