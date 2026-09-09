import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

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

/** Falls back to the local adapter until S3 credentials are configured and a real implementation
 * exists behind them — same factory pattern as the Phase 5 integrations. */
export function getStorageAdapter(): StorageAdapter {
  if (process.env.S3_BUCKET) {
    console.warn(
      "[storage] S3_BUCKET is set, but no real S3 adapter is implemented yet — falling back to local filesystem. See docs/06-integrations.md.",
    );
  }
  return localFilesystemAdapter;
}
