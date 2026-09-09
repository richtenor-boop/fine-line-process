import { describe, it, expect, afterEach } from "vitest";
import { getStorageAdapter } from "./storage";

describe("local filesystem storage adapter", () => {
  const written: string[] = [];

  afterEach(async () => {
    const adapter = getStorageAdapter();
    await Promise.all(written.splice(0).map((key) => adapter.deleteObject(key)));
  });

  it("round-trips a file: put, get, delete", async () => {
    const adapter = getStorageAdapter();
    const data = Buffer.from("hello fine line process");

    const stored = await adapter.putObject({ organizationId: "org_test", fileName: "note.txt", data });
    written.push(stored.storageKey);

    expect(stored.sizeBytes).toBe(data.byteLength);

    const roundTripped = await adapter.getObject(stored.storageKey);
    expect(roundTripped.toString()).toBe("hello fine line process");

    await adapter.deleteObject(stored.storageKey);
    written.pop();
    await expect(adapter.getObject(stored.storageKey)).rejects.toThrow();
  });

  it("scopes storage keys under the organization id and sanitizes the filename", async () => {
    const adapter = getStorageAdapter();
    const stored = await adapter.putObject({
      organizationId: "org_test",
      fileName: "weird name / with $pecial chars.pdf",
      data: Buffer.from("x"),
    });
    written.push(stored.storageKey);

    expect(stored.storageKey.startsWith("org_test/")).toBe(true);
    expect(stored.storageKey).not.toMatch(/[/\\]weird name/);
  });
});
