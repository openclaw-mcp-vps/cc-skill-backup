#!/usr/bin/env node

import { execSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import axios from "axios";
import chalk from "chalk";
import { Command } from "commander";
import cron from "node-cron";

import {
  expandHomePath,
  getConfigDir,
  loadConfig,
  saveConfig,
  type CliConfig
} from "@/cli/config";

interface InstallOptions {
  email?: string;
  token?: string;
  appUrl?: string;
  key?: string;
  saveKey?: boolean;
  source?: string;
  destination?: string;
  bucket?: string;
  region?: string;
  s3Prefix?: string;
  schedule?: boolean;
}

const WEEKLY_CRON = "0 3 * * 0";

async function fetchCliToken(appUrl: string, email: string) {
  const endpoint = `${appUrl.replace(/\/$/, "")}/api/auth/callback`;
  const response = await axios.post(endpoint, {
    email,
    mode: "cli"
  });

  const payload = response.data as { token?: string };
  if (!payload.token) {
    throw new Error("Auth endpoint did not return a CLI token.");
  }

  return payload.token;
}

function installCronJob() {
  if (!cron.validate(WEEKLY_CRON)) {
    throw new Error(`Invalid schedule expression: ${WEEKLY_CRON}`);
  }

  const marker = "# cc-skill-backup weekly backup";
  const configDir = getConfigDir();
  const logPath = path.join(configDir, "weekly-backup.log");
  const line = `${WEEKLY_CRON} npx cc-skill-backup backup >> ${logPath} 2>&1`;

  let current = "";
  try {
    current = execSync("crontab -l", { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });
  } catch {
    current = "";
  }

  if (current.includes(marker)) {
    return false;
  }

  const next = `${current.trimEnd()}\n${marker}\n${line}\n`;
  execSync("crontab -", { input: next });
  return true;
}

async function runInstall(options: InstallOptions) {
  const existing = await loadConfig();
  const merged: CliConfig = {
    ...existing,
    email: options.email ?? existing.email,
    appUrl: options.appUrl ?? existing.appUrl,
    sourcePath: options.source ? expandHomePath(options.source) : existing.sourcePath,
    destinationPath: options.destination
      ? expandHomePath(options.destination)
      : existing.destinationPath,
    s3Bucket: options.bucket ?? existing.s3Bucket,
    s3Region: options.region ?? existing.s3Region,
    s3Prefix: options.s3Prefix ?? existing.s3Prefix ?? "cc-skill-backup"
  };

  if (!merged.email) {
    throw new Error("Email is required. Pass --email with your checkout email.");
  }

  if (!merged.appUrl) {
    merged.appUrl = "http://localhost:3000";
  }

  if (options.token) {
    merged.token = options.token;
  }

  if (!merged.token) {
    merged.token = await fetchCliToken(merged.appUrl, merged.email);
  }

  if (options.saveKey && options.key) {
    merged.encryptionKey = options.key;
  }

  if (options.saveKey && !options.key) {
    throw new Error("--save-key requires --key.");
  }

  await saveConfig(merged);

  const configDir = getConfigDir();
  await mkdir(configDir, { recursive: true });
  const readmePath = path.join(configDir, "README.txt");
  await writeFile(
    readmePath,
    [
      "cc-skill-backup local config",
      "",
      "- config.json: saved account and S3 settings",
      "- weekly-backup.log: cron output for weekly jobs",
      "",
      "Use CC_SKILL_BACKUP_KEY for encryption key if you do not store it in config."
    ].join("\n"),
    "utf8"
  );

  if (options.schedule !== false) {
    const installed = installCronJob();
    if (installed) {
      console.log(chalk.green("Weekly cron backup installed (Sunday 03:00 local time)."));
    } else {
      console.log(chalk.blue("Weekly cron backup already configured."));
    }
  }

  console.log(chalk.green("Install complete."));
  console.log(chalk.white(`Config saved to ${path.join(configDir, "config.json")}`));

  if (!merged.encryptionKey && !options.key) {
    console.log(
      chalk.yellow(
        "Set CC_SKILL_BACKUP_KEY before running backup: export CC_SKILL_BACKUP_KEY='your-strong-passphrase'"
      )
    );
  }

  console.log(chalk.white("Run first backup now: npx cc-skill-backup backup"));
}

const program = new Command();

program
  .name("cc-skill-backup install")
  .description("Authenticate and configure weekly encrypted backups")
  .option("--email <email>", "checkout email used in Lemon Squeezy")
  .option("--token <token>", "pre-generated CLI token from dashboard")
  .option("--app-url <url>", "dashboard base URL", process.env.CC_SKILL_BACKUP_APP_URL)
  .option("--key <key>", "encryption key")
  .option("--save-key", "save encryption key to local config file", false)
  .option("--source <path>", "path to source config directory", "~/.claude")
  .option("--destination <path>", "path to restore target directory", "~/.claude")
  .option("--bucket <bucket>", "default S3 bucket")
  .option("--region <region>", "default S3 region")
  .option("--s3-prefix <prefix>", "default S3 key prefix", "cc-skill-backup")
  .option("--no-schedule", "skip installing weekly cron schedule")
  .action(async (options: InstallOptions) => {
    await runInstall(options);
  });

program.parseAsync(process.argv).catch((error) => {
  const message = error instanceof Error ? error.message : "Install failed.";
  console.error(chalk.red(message));
  process.exitCode = 1;
});
