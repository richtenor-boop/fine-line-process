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

/** See src/lib/modules/organizations/service.test.ts for the RUN_DB_TESTS opt-in rationale. */
describe.skipIf(process.env.RUN_DB_TESTS !== "1")("database storage adapter", () => {
  afterEach(() => {
    delete process.env.STORAGE_DRIVER;
  });

  it("round-trips a file through Postgres when STORAGE_DRIVER=database", async () => {
    process.env.STORAGE_DRIVER = "database";
    const adapter = getStorageAdapter();
    expect(adapter.name).toBe("database");
    expect(adapter.isDurable).toBe(true);

    const data = Buffer.from("%PDF-1.4 contract bytes");
    const stored = await adapter.putObject({ organizationId: "org_db_test", fileName: "../contract.pdf", data });
    expect(stored.storageKey.startsWith("org_db_test/")).toBe(true);
    expect((await adapter.getObject(stored.storageKey)).equals(data)).toBe(true);

    await adapter.deleteObject(stored.storageKey);
    await expect(adapter.getObject(stored.storageKey)).rejects.toThrow("File not found.");
  });

  it("defaults to the database on Vercel, where the filesystem doesn't persist", () => {
    process.env.VERCEL = "1";
    try {
      expect(getStorageAdapter().name).toBe("database");
    } finally {
      delete process.env.VERCEL;
    }
    expect(getStorageAdapter().name).toBe("local-filesystem");
  });
});
