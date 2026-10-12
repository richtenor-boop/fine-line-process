import { ExternalLink, FolderOpen, Film, FileText, Link2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { deleteMediaLinkAction } from "@/lib/modules/media-links/actions";
import { describeHost, MEDIA_LINK_KIND_LABELS, type MediaLinkKind } from "@/lib/modules/media-links/schema";
import { AddMediaLinkForm } from "./add-media-link-form";

interface MediaLinkRow {
  id: string;
  kind: MediaLinkKind;
  label: string;
  url: string;
}

const ICONS: Record<MediaLinkKind, typeof FolderOpen> = { PHOTOS: FolderOpen, VIDEO: Film, DOCUMENT: FileText, OTHER: Link2 };

export function MediaLinksSection({
  links,
  propertyId,
  leadId,
  canEdit,
}: {
  links: MediaLinkRow[];
  propertyId?: string;
  leadId?: string;
  canEdit: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pictures &amp; links</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {links.length === 0 && (
          <p className="text-sm text-muted">
            Paste a Dropbox, Google Drive, or Google Photos folder link so everyone can see the property photos.
          </p>
        )}
        <ul className="space-y-2">
          {links.map((link) => {
            const Icon = ICONS[link.kind];
            return (
              <li key={link.id} className="flex items-stretch overflow-hidden rounded-md border border-border">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="flex min-w-0 flex-1 items-center gap-3 hover:bg-slate-50"
                >
                  <span className="flex w-16 shrink-0 items-center justify-center self-stretch bg-sky-50 text-sky-600">
                    <Icon className="h-7 w-7" />
                  </span>
                  <span className="min-w-0 py-2">
                    <span className="block truncate text-sm font-medium text-foreground">{link.label}</span>
                    <span className="block truncate text-xs text-muted">
                      {MEDIA_LINK_KIND_LABELS[link.kind]} · {describeHost(link.url)}
                    </span>
                  </span>
                  <ExternalLink className="ml-auto mr-2 h-4 w-4 shrink-0 text-muted" />
                </a>
                {canEdit && (
                  <form action={deleteMediaLinkAction} className="flex items-center border-l border-border">
                    <input type="hidden" name="linkId" value={link.id} />
                    {propertyId && <input type="hidden" name="propertyId" value={propertyId} />}
                    {leadId && <input type="hidden" name="leadId" value={leadId} />}
                    <Button type="submit" variant="ghost" className="h-full rounded-none text-xs text-danger" aria-label={`Remove ${link.label}`}>
                      Remove
                    </Button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
        {canEdit && <AddMediaLinkForm propertyId={propertyId} leadId={leadId} hasLinks={links.length > 0} />}
      </CardContent>
    </Card>
  );
}
