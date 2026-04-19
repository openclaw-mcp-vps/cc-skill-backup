#!/usr/bin/env node

import { access, mkdtemp, mkdir, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import axios from "axios";
import chalk from "chalk";
import { Command } from "commander";
import * as tar from "tar";

import { expandHomePath, loadConfig } from "@/cli/config";
import { decryptBuffer } from "@/lib/encryption";
import { createS3Client, downloadFromS3, getLatestBackupKey } from "@/lib/s3";

interface RestoreOptions {
  destination?: string;
  appUrl?: string;
  token?: string;
  key?: string;
  bucket?: string;
  region?: string;
  s3Prefix?: string;
  s3Key?: string;
  backupId?: string;
}

async function exists(targetPath: string) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function downloadHostedBackup(params: {
  appUrl: string;
  token: string;
  backupId?: string;
}) {
  const endpoint = `${params.appUrl.replace(/\/$/, "")}/api/backup/download`;

  const response = await axios.get(endpoint, {
    params: params.backupId ? { id: params.backupId } : undefined,
    responseType: "arraybuffer",
    headers: {
      Authorization: `Bearer ${params.token}`
    }
  });

  return Buffer.from(response.data);
}

async function downloadS3Backup(params: {
  bucket: string;
  region: string;
  email: string;
  s3Prefix: string;
  s3Key?: string;
}) {
  const client = createS3Client({
    region: params.region,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  });

  const resolvedKey =
    params.s3Key ??
    (await getLatestBackupKey({
      client,
      bucket: params.bucket,
      prefix: `${params.s3Prefix}/${params.email.toLowerCase()}`
    }));

  if (!resolvedKey) {
    throw new Error("No S3 backup object found for the configured prefix.");
  }

  return downloadFromS3({
    client,
    bucket: params.bucket,
    key: resolvedKey
  });
}

async function restoreArchiveToDestination(archiveBuffer: Buffer, destinationPath: string) {
  const temporaryDir = await mkdtemp(path.join(os.tmpdir(), "ccsb-restore-"));
  const archivePath = path.join(temporaryDir, "claude-config.tar.gz");

  await writeFile(archivePath, archiveBuffer);

  const backupPath = `${destinationPath}.pre-restore-${Date.now()}`;
  if (await exists(destinationPath)) {
    await rename(destinationPath, backupPath);
    console.log(chalk.yellow(`Existing config moved to ${backupPath}`));
  }

  await mkdir(destinationPath, { recursive: true });

  await tar.extract({
    file: archivePath,
    cwd: destinationPath
  });

  await rm(temporaryDir, { recursive: true, force: true });
}

async function runRestore(options: RestoreOptions) {
  const config = await loadConfig();

  const destinationPath = expandHomePath(options.destination ?? config.destinationPath ?? "~/.claude");
  const encryptionKey = options.key ?? process.env.CC_SKILL_BACKUP_KEY ?? config.encryptionKey;

  if (!encryptionKey) {
    throw new Error(
      "Missing encryption key. Provide --key, set CC_SKILL_BACKUP_KEY, or store a key during install."
    );
  }

  const bucket = options.bucket ?? config.s3Bucket;
  const region = options.region ?? config.s3Region ?? process.env.AWS_REGION;

  let encryptedPayload: Buffer;

  if (bucket) {
    if (!region) {
      throw new Error("S3 restore requires a region. Use --region or set AWS_REGION.");
    }

    const email = config.email;
    if (!email) {
      throw new Error("Email is required for S3 prefix lookup. Re-run install with --email.");
    }

    encryptedPayload = await downloadS3Backup({
      bucket,
      region,
      email,
      s3Prefix: options.s3Prefix ?? config.s3Prefix ?? "cc-skill-backup",
      s3Key: options.s3Key
    });
  } else {
    const appUrl = options.appUrl ?? config.appUrl;
    const token = options.token ?? config.token;

    if (!appUrl || !token) {
      throw new Error(
        "Hosted restore requires saved config. Run `npx cc-skill-backup install` or pass --app-url and --token."
      );
    }

    encryptedPayload = await downloadHostedBackup({
      appUrl,
      token,
      backupId: options.backupId
    });
  }

  const decryptedArchive = decryptBuffer(encryptedPayload, encryptionKey);
  await restoreArchiveToDestination(decryptedArchive, destinationPath);

  console.log(chalk.green(`Restore complete at ${destinationPath}`));
}

const program = new Command();

program
  .name("cc-skill-backup restore")
  .description("Download latest encrypted backup and restore ~/.claude")
  .option("--destination <path>", "restore target directory", "~/.claude")
  .option("--app-url <url>", "dashboard base URL")
  .option("--token <token>", "CLI token")
  .option("--key <key>", "encryption key")
  .option("--backup-id <id>", "specific hosted backup ID")
  .option("--bucket <bucket>", "restore directly from S3 bucket")
  .option("--region <region>", "S3 region")
  .option("--s3-prefix <prefix>", "S3 key prefix", "cc-skill-backup")
  .option("--s3-key <key>", "specific S3 object key")
  .action(async (options: RestoreOptions) => {
    await runRestore(options);
  });

program.parseAsync(process.argv).catch((error) => {
  const message = error instanceof Error ? error.message : "Restore failed.";
  console.error(chalk.red(message));
  process.exitCode = 1;
});
