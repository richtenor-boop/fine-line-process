import { describe, it, expect } from "vitest";
import { createMediaLinkSchema, describeHost } from "./schema";

describe("media links", () => {
  it("recognizes common photo hosts", () => {
    expect(describeHost("https://www.dropbox.com/sh/abc/80-howard")).toBe("Dropbox");
    expect(describeHost("https://drive.google.com/drive/folders/x")).toBe("Google Drive");
    expect(describeHost("https://photos.app.goo.gl/x")).toBe("Google Photos");
    expect(describeHost("https://example.com/a")).toBe("example.com");
  });

  it("only accepts http(s) links", () => {
    expect(createMediaLinkSchema.safeParse({ propertyId: "p", url: "https://dropbox.com/x" }).success).toBe(true);
    expect(createMediaLinkSchema.safeParse({ propertyId: "p", url: "javascript:alert(1)" }).success).toBe(false);
    expect(createMediaLinkSchema.safeParse({ propertyId: "p", url: "dropbox folder" }).success).toBe(false);
  });

  it("requires a property or lead", () => {
    expect(createMediaLinkSchema.safeParse({ url: "https://dropbox.com/x" }).success).toBe(false);
  });
});
