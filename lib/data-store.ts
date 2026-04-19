import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { BackupRecord, SubscriptionRecord } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const STORAGE_DIR = path.join(process.cwd(), "storage", "backups");
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, "subscriptions.json");
const BACKUPS_FILE = path.join(DATA_DIR, "backups.json");

async function ensureJsonFile(filePath: string) {
  try {
    await readFile(filePath, "utf8");
  } catch {
    await writeFile(filePath, "[]", "utf8");
  }
}

export async function ensureDataStore() {
  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(STORAGE_DIR, { recursive: true });
  await ensureJsonFile(SUBSCRIPTIONS_FILE);
  await ensureJsonFile(BACKUPS_FILE);
}

async function readJsonArray<T>(filePath: string): Promise<T[]> {
  await ensureDataStore();
  const raw = await readFile(filePath, "utf8");
  if (!raw.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeJsonArray<T>(filePath: string, data: T[]) {
  await ensureDataStore();
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

export async function getSubscriptions(): Promise<SubscriptionRecord[]> {
  return readJsonArray<SubscriptionRecord>(SUBSCRIPTIONS_FILE);
}

export async function getSubscriptionByEmail(email: string): Promise<SubscriptionRecord | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const subscriptions = await getSubscriptions();
  return subscriptions.find((subscription) => subscription.email.toLowerCase() === normalizedEmail) ?? null;
}

export async function upsertSubscription(nextSubscription: SubscriptionRecord): Promise<SubscriptionRecord> {
  const subscriptions = await getSubscriptions();
  const normalizedEmail = nextSubscription.email.trim().toLowerCase();
  const existingIndex = subscriptions.findIndex(
    (subscription) => subscription.email.toLowerCase() === normalizedEmail
  );

  if (existingIndex >= 0) {
    subscriptions[existingIndex] = nextSubscription;
  } else {
    subscriptions.push(nextSubscription);
  }

  await writeJsonArray(SUBSCRIPTIONS_FILE, subscriptions);
  return nextSubscription;
}

export async function getBackups(): Promise<BackupRecord[]> {
  return readJsonArray<BackupRecord>(BACKUPS_FILE);
}

export async function addBackup(backupRecord: BackupRecord): Promise<BackupRecord> {
  const backups = await getBackups();
  backups.push(backupRecord);
  await writeJsonArray(BACKUPS_FILE, backups);
  return backupRecord;
}

export async function getLatestBackupForEmail(email: string): Promise<BackupRecord | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const backups = await getBackups();

  const candidateBackups = backups
    .filter((backup) => backup.email.toLowerCase() === normalizedEmail)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return candidateBackups[0] ?? null;
}

export async function getBackupByIdForEmail(email: string, backupId: string): Promise<BackupRecord | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const backups = await getBackups();

  return (
    backups.find(
      (backup) =>
        backup.id === backupId && backup.email.trim().toLowerCase() === normalizedEmail
    ) ?? null
  );
}

export function getStorageDirectory() {
  return STORAGE_DIR;
}
