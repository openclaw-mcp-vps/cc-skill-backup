export type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  paid: boolean;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type BackupRecord = {
  id: string;
  userId: string;
  storageKey: string;
  sizeBytes: number;
  checksum?: string;
  createdAt: string;
};

export type PurchaseRecord = {
  email: string;
  paidAt: string;
  source: "stripe" | "lemonsqueezy";
};

export type AppState = {
  users: UserRecord[];
  backups: BackupRecord[];
  purchases: PurchaseRecord[];
};

export type SessionPayload = {
  userId: string;
  email: string;
  paid: boolean;
};
