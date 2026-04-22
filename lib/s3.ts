import AWS from "aws-sdk";
import { readLocalBackup, writeLocalBackup } from "@/lib/storage";

function configuredS3(): AWS.S3 | null {
  const region = process.env.S3_REGION;
  const bucket = process.env.S3_BUCKET;
  if (!region || !bucket) {
    return null;
  }

  const options: AWS.S3.ClientConfiguration = { region };
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    options.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    };
  }

  return new AWS.S3(options);
}

export function hostedStorageBucket(): string | null {
  return process.env.S3_BUCKET ?? null;
}

export async function putBackupObject(storageKey: string, body: string): Promise<void> {
  const s3 = configuredS3();
  const bucket = hostedStorageBucket();

  if (!s3 || !bucket) {
    await writeLocalBackup(storageKey, body);
    return;
  }

  await s3
    .putObject({
      Bucket: bucket,
      Key: storageKey,
      Body: body,
      ContentType: "application/json"
    })
    .promise();
}

export async function getBackupObject(storageKey: string): Promise<string> {
  const s3 = configuredS3();
  const bucket = hostedStorageBucket();

  if (!s3 || !bucket) {
    return readLocalBackup(storageKey);
  }

  const out = await s3
    .getObject({
      Bucket: bucket,
      Key: storageKey
    })
    .promise();

  if (!out.Body) {
    throw new Error("Backup payload is empty.");
  }

  const body = out.Body as unknown;
  if (typeof body === "string") {
    return body;
  }

  if (Buffer.isBuffer(body)) {
    return body.toString("utf8");
  }

  if (body instanceof Uint8Array) {
    return Buffer.from(body).toString("utf8");
  }

  if (
    typeof body === "object" &&
    body !== null &&
    "arrayBuffer" in body &&
    typeof body.arrayBuffer === "function"
  ) {
    const arrayBuffer = await body.arrayBuffer();
    return Buffer.from(arrayBuffer).toString("utf8");
  }

  throw new Error("Unsupported backup object body type.");
}
