import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { AppState, BackupRecord, PurchaseRecord, UserRecord } from "@/lib/types";

const dataDir = path.join(process.cwd(), "data");
const stateFile = path.join(dataDir, "state.json");
const backupDir = path.join(dataDir, "backups");

const defaultState: AppState = {
  users: [],
  backups: [],
  purchases: []
};

async function ensureStorage() {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(backupDir, { recursive: true });

  try {
    await fs.access(stateFile);
  } catch {
    await fs.writeFile(stateFile, JSON.stringify(defaultState, null, 2), "utf8");
  }
}

export async function readState(): Promise<AppState> {
  await ensureStorage();
  const raw = await fs.readFile(stateFile, "utf8");
  return JSON.parse(raw) as AppState;
}

export async function writeState(state: AppState): Promise<void> {
  await ensureStorage();
  await fs.writeFile(stateFile, JSON.stringify(state, null, 2), "utf8");
}

export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  const state = await readState();
  return state.users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function getUserById(id: string): Promise<UserRecord | null> {
  const state = await readState();
  return state.users.find((user) => user.id === id) ?? null;
}

export async function createUser(params: {
  email: string;
  passwordHash: string;
  paid: boolean;
  paidAt?: string;
}): Promise<UserRecord> {
  const state = await readState();
  const now = new Date().toISOString();
  const newUser: UserRecord = {
    id: randomUUID(),
    email: params.email.toLowerCase(),
    passwordHash: params.passwordHash,
    paid: params.paid,
    paidAt: params.paidAt,
    createdAt: now,
    updatedAt: now
  };

  state.users.push(newUser);
  await writeState(state);
  return newUser;
}

export async function updateUser(userId: string, update: Partial<UserRecord>): Promise<UserRecord | null> {
  const state = await readState();
  const idx = state.users.findIndex((user) => user.id === userId);
  if (idx === -1) {
    return null;
  }

  const updated = {
    ...state.users[idx],
    ...update,
    updatedAt: new Date().toISOString()
  } satisfies UserRecord;

  state.users[idx] = updated;
  await writeState(state);
  return updated;
}

export async function upsertPurchase(purchase: PurchaseRecord): Promise<void> {
  const state = await readState();
  const existing = state.purchases.find(
    (p) => p.email.toLowerCase() === purchase.email.toLowerCase() && p.source === purchase.source
  );

  if (existing) {
    existing.paidAt = purchase.paidAt;
  } else {
    state.purchases.push({ ...purchase, email: purchase.email.toLowerCase() });
  }

  const user = state.users.find((u) => u.email.toLowerCase() === purchase.email.toLowerCase());
  if (user) {
    user.paid = true;
    user.paidAt = purchase.paidAt;
    user.updatedAt = new Date().toISOString();
  }

  await writeState(state);
}

export async function hasPaidPurchase(email: string): Promise<PurchaseRecord | null> {
  const state = await readState();
  return state.purchases.find((p) => p.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function addBackupRecord(record: Omit<BackupRecord, "id" | "createdAt">): Promise<BackupRecord> {
  const state = await readState();
  const newRecord: BackupRecord = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...record
  };

  state.backups.push(newRecord);
  await writeState(state);
  return newRecord;
}

export async function listBackupsForUser(userId: string): Promise<BackupRecord[]> {
  const state = await readState();
  return state.backups
    .filter((backup) => backup.userId === userId)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export async function latestBackupForUser(userId: string): Promise<BackupRecord | null> {
  const backups = await listBackupsForUser(userId);
  return backups[0] ?? null;
}

export function backupFilePath(storageKey: string): string {
  return path.join(backupDir, storageKey);
}

export async function writeLocalBackup(storageKey: string, content: string): Promise<void> {
  const target = backupFilePath(storageKey);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content, "utf8");
}

export async function readLocalBackup(storageKey: string): Promise<string> {
  const target = backupFilePath(storageKey);
  return fs.readFile(target, "utf8");
}
