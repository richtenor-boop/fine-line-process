import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/rbac";
import { getDocument } from "@/lib/modules/documents/service";
import { getStorageAdapter } from "@/lib/storage";

/**
 * Serves a document's bytes for preview/download — a Server Action can't stream a binary
 * response, so this is the one legitimate Route Handler in the Documents module. `?download=1`
 * forces Content-Disposition: attachment; otherwise the browser previews inline when it can.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  const forceDownload = url.searchParams.get("download") === "1";

  const permission = forceDownload ? "documents:download" : "documents:view";
  const session = await requirePermission(permission);

  const document = await getDocument(session.user.organizationId, id);
  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let bytes: Buffer;
  try {
    bytes = await getStorageAdapter().getObject(document.storageKey);
  } catch {
    return NextResponse.json({ error: "File is no longer available in storage." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": document.mimeType || "application/octet-stream",
      "Content-Disposition": `${forceDownload ? "attachment" : "inline"}; filename="${encodeURIComponent(document.fileName)}"`,
      "Content-Length": String(bytes.byteLength),
    },
  });
}
