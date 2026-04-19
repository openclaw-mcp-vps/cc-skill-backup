import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  addBackup,
  getBackupByIdForEmail,
  getLatestBackupForEmail,
  getStorageDirectory
} from "@/lib/data-store";
import type { BackupRecord } from "@/lib/types";

function emailToPathSafeSegment(email: string) {
  return email.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "_");
}

export async function saveHostedBackup(params: {
  email: string;
  payload: Buffer;
  machineName: string;
}) {
  const storageRoot = getStorageDirectory();
  const userSegment = emailToPathSafeSegment(params.email);
  const userDir = path.join(storageRoot, userSegment);
  await mkdir(userDir, { recursive: true });

  const backupId = randomUUID();
  const fileName = `${new Date().toISOString().replace(/[:.]/g, "-")}-${backupId}.enc`;
  const absolutePath = path.join(userDir, fileName);
  const relativePath = path.join(userSegment, fileName);

  await writeFile(absolutePath, params.payload);

  const checksum = createHash("sha256").update(params.payload).digest("hex");

  const record: BackupRecord = {
    id: backupId,
    email: params.email,
    machineName: params.machineName,
    provider: "hosted",
    createdAt: new Date().toISOString(),
    sizeBytes: params.payload.byteLength,
    checksumSha256: checksum,
    storagePath: relativePath
  };

  await addBackup(record);
  return record;
}

async function getBackupRecord(email: string, backupId?: string) {
  if (backupId) {
    return getBackupByIdForEmail(email, backupId);
  }

  return getLatestBackupForEmail(email);
}

export async function readHostedBackup(params: { email: string; backupId?: string }) {
  const record = await getBackupRecord(params.email, params.backupId);
  if (!record || record.provider !== "hosted" || !record.storagePath) {
    return null;
  }

  const absolutePath = path.join(getStorageDirectory(), record.storagePath);
  const payload = await readFile(absolutePath);

  return { record, payload };
}
