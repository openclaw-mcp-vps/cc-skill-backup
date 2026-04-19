#!/usr/bin/env node

import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import axios from "axios";
import chalk from "chalk";
import { Command } from "commander";
import cron from "node-cron";
import * as tar from "tar";

import { expandHomePath, loadConfig } from "@/cli/config";
import { encryptBuffer } from "@/lib/encryption";
import { createS3Client, uploadToS3 } from "@/lib/s3";

interface BackupOptions {
  source?: string;
  appUrl?: string;
  token?: string;
  key?: string;
  bucket?: string;
  region?: string;
  s3Prefix?: string;
  s3Key?: string;
  daemon?: boolean;
}

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function sanitizeForS3(input: string) {
  return input.trim().toLowerCase().replace(/[^a-z0-9/_-]/g, "-");
}

async function createEncryptedArchive(sourcePath: string, encryptionKey: string) {
  const temporaryDir = await mkdtemp(path.join(os.tmpdir(), "ccsb-backup-"));
  const archivePath = path.join(temporaryDir, "claude-config.tar.gz");

  await tar.create(
    {
      gzip: true,
      file: archivePath,
      cwd: sourcePath
    },
    ["."]
  );

  const archiveBuffer = await readFile(archivePath);
  const encrypted = encryptBuffer(archiveBuffer, encryptionKey);
  await rm(temporaryDir, { recursive: true, force: true });

  return encrypted;
}

async function uploadHostedBackup(params: {
  appUrl: string;
  token: string;
  payload: Buffer;
}) {
  const endpoint = `${params.appUrl.replace(/\/$/, "")}/api/backup/upload`;

  const response = await axios.post(endpoint, params.payload, {
    headers: {
      Authorization: `Bearer ${params.token}`,
      "Content-Type": "application/octet-stream",
      "x-machine-name": os.hostname()
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity
  });

  return response.data as {
    backupId: string;
    createdAt: string;
    sizeBytes: number;
  };
}

async function uploadS3Backup(params: {
  bucket: string;
  region: string;
  payload: Buffer;
  email: string;
  s3Prefix: string;
  s3Key?: string;
}) {
  const client = createS3Client({
    region: params.region,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  });

  const objectKey =
    params.s3Key ?? `${sanitizeForS3(params.s3Prefix)}/${sanitizeForS3(params.email)}/${nowStamp()}.enc`;

  await uploadToS3({
    client,
    bucket: params.bucket,
    key: objectKey,
    body: params.payload,
    contentType: "application/octet-stream"
  });

  return objectKey;
}

async function runBackup(options: BackupOptions) {
  const config = await loadConfig();

  const sourcePath = expandHomePath(options.source ?? config.sourcePath ?? "~/.claude");
  const encryptionKey = options.key ?? process.env.CC_SKILL_BACKUP_KEY ?? config.encryptionKey;

  if (!encryptionKey) {
    throw new Error(
      "Missing encryption key. Provide --key, set CC_SKILL_BACKUP_KEY, or save a key during install."
    );
  }

  const payload = await createEncryptedArchive(sourcePath, encryptionKey);

  const bucket = options.bucket ?? config.s3Bucket;
  const region = options.region ?? config.s3Region ?? process.env.AWS_REGION;

  if (bucket) {
    if (!region) {
      throw new Error("S3 backups require a region. Use --region or set AWS_REGION.");
    }

    const email = config.email ?? "unknown-user";
    const s3Prefix = options.s3Prefix ?? config.s3Prefix ?? "cc-skill-backup";

    const objectKey = await uploadS3Backup({
      bucket,
      region,
      payload,
      email,
      s3Prefix,
      s3Key: options.s3Key
    });

    console.log(chalk.green(`Encrypted backup uploaded to s3://${bucket}/${objectKey}`));
    return;
  }

  const token = options.token ?? config.token;
  const appUrl = options.appUrl ?? config.appUrl;

  if (!token || !appUrl) {
    throw new Error(
      "Hosted backups require account config. Run `npx cc-skill-backup install` first or provide --token and --app-url."
    );
  }

  const result = await uploadHostedBackup({
    appUrl,
    token,
    payload
  });

  console.log(chalk.green(`Backup ${result.backupId} uploaded at ${result.createdAt}.`));
}

async function runDaemon(options: BackupOptions) {
  const cronExpression = "0 3 * * 0";

  if (!cron.validate(cronExpression)) {
    throw new Error(`Invalid cron expression: ${cronExpression}`);
  }

  await runBackup(options);

  cron.schedule(cronExpression, async () => {
    try {
      await runBackup(options);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      console.error(chalk.red(`Scheduled backup failed: ${message}`));
    }
  });

  console.log(chalk.blue("Weekly scheduler running (Sunday 03:00 local time). Press Ctrl+C to stop."));

  await new Promise(() => undefined);
}

const program = new Command();

program
  .name("cc-skill-backup backup")
  .description("Encrypt ~/.claude and upload a backup payload")
  .option("--source <path>", "source config directory", "~/.claude")
  .option("--app-url <url>", "dashboard base URL")
  .option("--token <token>", "CLI token from dashboard")
  .option("--key <key>", "encryption key")
  .option("--bucket <bucket>", "upload directly to S3 bucket")
  .option("--region <region>", "S3 region")
  .option("--s3-prefix <prefix>", "S3 key prefix", "cc-skill-backup")
  .option("--s3-key <key>", "explicit S3 object key")
  .option("--daemon", "keep process alive and run weekly via node-cron", false)
  .action(async (options: BackupOptions) => {
    if (options.daemon) {
      await runDaemon(options);
      return;
    }

    await runBackup(options);
  });

program.parseAsync(process.argv).catch((error) => {
  const message = error instanceof Error ? error.message : "Backup failed.";
  console.error(chalk.red(message));
  process.exitCode = 1;
});
