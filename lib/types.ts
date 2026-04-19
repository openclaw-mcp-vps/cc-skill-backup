export type SubscriptionStatus = "active" | "inactive";

export interface SubscriptionRecord {
  email: string;
  status: SubscriptionStatus;
  lemonCustomerId?: string;
  lemonSubscriptionId?: string;
  updatedAt: string;
}

export interface BackupRecord {
  id: string;
  email: string;
  machineName: string;
  provider: "hosted" | "s3";
  createdAt: string;
  sizeBytes: number;
  checksumSha256: string;
  storagePath?: string;
  s3Bucket?: string;
  s3Key?: string;
  s3Region?: string;
}
