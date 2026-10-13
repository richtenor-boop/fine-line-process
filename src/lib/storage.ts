import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";

/**
 * Object storage — see docs/06-integrations.md §Object Storage. Unlike the Phase 5 telephony/
 * email providers, the local adapter here is not a mock: it genuinely reads and writes files, so
 * upload/preview/download work for real in dev and in this sandbox. What it can't do is survive a
 * redeploy on most hosting platforms (ephemeral disk) — that's the one thing a real S3-compatible
 * bucket buys you, and the only reason this remains "swap before production," not "swap before it
 * works at all."
 */

export interface StoredObject {
  storageKey: string;
  sizeBytes: number;
}

export interface StorageAdapter {
  readonly name: string;
  readonly isDurable: boolean; // false = survives only as long as the local disk does
  putObject(input: { organizationId: string; fileName: string; data: Buffer }): Promise<StoredObject>;
  getObject(storageKey: string): Promise<Buffer>;
  deleteObject(storageKey: string): Promise<void>;
}

const UPLOAD_ROOT = path.join(process.cwd(), ".data", "uploads");

function safeKeySegment(input: string): string {
  return input.replace(/[^a-zA-Z0-9._-]/g, "_");
}

const localFilesystemAdapter: StorageAdapter = {
  name: "local-filesystem",
  isDurable: false,

  async putObject({ organizationId, fileName, data }) {
    const storageKey = `${safeKeySegment(organizationId)}/${crypto.randomUUID()}-${safeKeySegment(fileName)}`;
    const fullPath = path.join(UPLOAD_ROOT, storageKey);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, data);
    return { storageKey, sizeBytes: data.byteLength };
  },

  async getObject(storageKey) {
    const fullPath = path.join(UPLOAD_ROOT, storageKey);
    if (!fullPath.startsWith(UPLOAD_ROOT)) throw new Error("Invalid storage key.");
    return fs.readFile(fullPath);
  },

  async deleteObject(storageKey) {
    const fullPath = path.join(UPLOAD_ROOT, storageKey);
    if (!fullPath.startsWith(UPLOAD_ROOT)) throw new Error("Invalid storage key.");
    await fs.rm(fullPath, { force: true });
  },
};

/** Durable and private (bytes live in Postgres, served only through the permission-checked
 * /api/documents route). Right for contracts and PDFs at small-team volume; database size is the
 * limit, so move to S3-compatible storage before storing large media at scale. */
const databaseAdapter: StorageAdapter = {
  name: "database",
  isDurable: true,

  async putObject({ organizationId, fileName, data }) {
    const storageKey = `${safeKeySegment(organizationId)}/${crypto.randomUUID()}-${safeKeySegment(fileName)}`;
    await prisma.storedFile.create({
      data: { key: storageKey, organizationId, data: new Uint8Array(data), sizeBytes: data.byteLength },
    });
    return { storageKey, sizeBytes: data.byteLength };
  },

  async getObject(storageKey) {
    const file = await prisma.storedFile.findUnique({ where: { key: storageKey } });
    if (!file) throw new Error("File not found.");
    return Buffer.from(file.data);
  },

  async deleteObject(storageKey) {
    await prisma.storedFile.deleteMany({ where: { key: storageKey } });
  },
};

/**
 * STORAGE_DRIVER picks the adapter explicitly ("database" | "local"). Unset, it uses the database
 * on Vercel — whose filesystem doesn't persist between requests, so the local adapter would
 * silently lose uploads — and the local disk everywhere else.
 */
export function getStorageAdapter(): StorageAdapter {
  if (process.env.S3_BUCKET) {
    console.warn(
      "[storage] S3_BUCKET is set, but no real S3 adapter is implemented yet — ignoring it. See docs/06-integrations.md.",
    );
  }
  const driver = process.env.STORAGE_DRIVER ?? (process.env.VERCEL ? "database" : "local");
  return driver === "database" ? databaseAdapter : localFilesystemAdapter;
}
