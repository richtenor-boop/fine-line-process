import { z } from "zod";

export const mediaLinkKindEnum = z.enum(["PHOTOS", "VIDEO", "DOCUMENT", "OTHER"]);
export type MediaLinkKind = z.infer<typeof mediaLinkKindEnum>;

export const MEDIA_LINK_KIND_LABELS: Record<MediaLinkKind, string> = {
  PHOTOS: "Photos",
  VIDEO: "Video",
  DOCUMENT: "Document",
  OTHER: "Link",
};

export const createMediaLinkSchema = z
  .object({
    propertyId: z.string().optional().or(z.literal("")),
    leadId: z.string().optional().or(z.literal("")),
    kind: mediaLinkKindEnum.default("PHOTOS"),
    label: z.string().trim().max(160).optional().or(z.literal("")),
    // http(s) only: a javascript: or data: URL rendered as a link would be an XSS vector.
    url: z
      .string()
      .trim()
      .max(2000)
      .url("Enter a full link, starting with https://")
      .refine((u) => /^https?:\/\//i.test(u), "Only http(s) links are allowed"),
  })
  .refine((d) => d.propertyId || d.leadId, { message: "A link must belong to a property or a lead", path: ["url"] });
export type CreateMediaLinkInput = z.infer<typeof createMediaLinkSchema>;

/** Friendly name for well-known photo/file hosts, shown on the link card like Podio's preview. */
export function describeHost(url: string): string {
  let host: string;
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Link";
  }
  if (host.endsWith("dropbox.com")) return "Dropbox";
  if (host === "photos.google.com" || host === "photos.app.goo.gl") return "Google Photos";
  if (host.endsWith("drive.google.com") || host.endsWith("docs.google.com")) return "Google Drive";
  if (host.endsWith("onedrive.live.com") || host.endsWith("1drv.ms") || host.endsWith("sharepoint.com")) return "OneDrive";
  if (host.endsWith("icloud.com")) return "iCloud";
  if (host.endsWith("youtube.com") || host === "youtu.be") return "YouTube";
  if (host.endsWith("zillow.com")) return "Zillow";
  return host;
}
