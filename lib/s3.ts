import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig
} from "@aws-sdk/client-s3";

interface S3Config {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export function createS3Client(config: S3Config) {
  const clientConfig: S3ClientConfig = {
    region: config.region
  };

  if (config.accessKeyId && config.secretAccessKey) {
    clientConfig.credentials = {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    };
  }

  return new S3Client(clientConfig);
}

export async function uploadToS3(params: {
  client: S3Client;
  bucket: string;
  key: string;
  body: Buffer;
  contentType?: string;
}) {
  await params.client.send(
    new PutObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType ?? "application/octet-stream"
    })
  );
}

async function streamToBuffer(body: unknown): Promise<Buffer> {
  if (!body) {
    return Buffer.alloc(0);
  }

  if (Buffer.isBuffer(body)) {
    return body;
  }

  if (typeof body === "string") {
    return Buffer.from(body);
  }

  if (typeof (body as { transformToByteArray?: () => Promise<Uint8Array> }).transformToByteArray === "function") {
    const byteArray = await (
      body as { transformToByteArray: () => Promise<Uint8Array> }
    ).transformToByteArray();
    return Buffer.from(byteArray);
  }

  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array | Buffer>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

export async function downloadFromS3(params: {
  client: S3Client;
  bucket: string;
  key: string;
}) {
  const response = await params.client.send(
    new GetObjectCommand({
      Bucket: params.bucket,
      Key: params.key
    })
  );

  return streamToBuffer(response.Body);
}

export async function getLatestBackupKey(params: {
  client: S3Client;
  bucket: string;
  prefix: string;
}) {
  const response = await params.client.send(
    new ListObjectsV2Command({
      Bucket: params.bucket,
      Prefix: params.prefix
    })
  );

  const candidates = (response.Contents ?? []).filter((item) => item.Key && item.LastModified);
  if (!candidates.length) {
    return null;
  }

  candidates.sort((a, b) => {
    const left = a.LastModified?.getTime() ?? 0;
    const right = b.LastModified?.getTime() ?? 0;
    return right - left;
  });

  return candidates[0]?.Key ?? null;
}
