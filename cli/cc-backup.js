#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { promisify } = require("node:util");
const cron = require("node-cron");
const AWS = require("aws-sdk");
const { Command } = require("commander");

const scrypt = promisify(crypto.scrypt);
const program = new Command();

const CONFIG_DIR = path.join(os.homedir(), ".config", "cc-skill-backup");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");
const CLAUDE_ROOT = path.join(os.homedir(), ".claude");
const CLAUDE_TARGETS = ["hooks", "skills", "plugins", "commands"];

function nowIso() {
  return new Date().toISOString();
}

function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

async function ensureConfigDir() {
  await fsp.mkdir(CONFIG_DIR, { recursive: true });
}

async function readConfig() {
  try {
    const raw = await fsp.readFile(CONFIG_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeConfig(config) {
  await ensureConfigDir();
  await fsp.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
}

async function walkFiles(rootDir) {
  const entries = await fsp.readdir(rootDir, { withFileTypes: true });
  const output = [];

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      output.push(...(await walkFiles(fullPath)));
    } else if (entry.isFile()) {
      output.push(fullPath);
    }
  }

  return output;
}

async function collectClaudeSnapshot() {
  const snapshot = {
    createdAt: nowIso(),
    machine: os.hostname(),
    files: {}
  };

  for (const target of CLAUDE_TARGETS) {
    const dirPath = path.join(CLAUDE_ROOT, target);
    if (!fs.existsSync(dirPath)) {
      continue;
    }

    const files = await walkFiles(dirPath);
    for (const filePath of files) {
      const rel = path.relative(CLAUDE_ROOT, filePath);
      const content = await fsp.readFile(filePath);
      const stat = await fsp.stat(filePath);
      snapshot.files[rel] = {
        mode: stat.mode,
        base64: content.toString("base64")
      };
    }
  }

  return snapshot;
}

async function restoreClaudeSnapshot(snapshot) {
  if (!snapshot.files || typeof snapshot.files !== "object") {
    throw new Error("Invalid snapshot format.");
  }

  const entries = Object.entries(snapshot.files);
  for (const [relPath, file] of entries) {
    const fullPath = path.join(CLAUDE_ROOT, relPath);
    await fsp.mkdir(path.dirname(fullPath), { recursive: true });
    await fsp.writeFile(fullPath, Buffer.from(file.base64, "base64"));
    if (typeof file.mode === "number") {
      await fsp.chmod(fullPath, file.mode);
    }
  }

  return entries.length;
}

async function encryptJson(data, passphrase) {
  const iv = crypto.randomBytes(12);
  const salt = crypto.randomBytes(16);
  const key = await scrypt(passphrase, salt, 32);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const payload = Buffer.concat([cipher.update(JSON.stringify(data), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return JSON.stringify({
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    salt: salt.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: payload.toString("base64")
  });
}

async function decryptJson(payload, passphrase) {
  const blob = JSON.parse(payload);
  const key = await scrypt(passphrase, Buffer.from(blob.salt, "base64"), 32);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(blob.iv, "base64"));
  decipher.setAuthTag(Buffer.from(blob.tag, "base64"));

  const out = Buffer.concat([
    decipher.update(Buffer.from(blob.ciphertext, "base64")),
    decipher.final()
  ]);

  return JSON.parse(out.toString("utf8"));
}

async function apiRequest(baseUrl, route, method, token, body) {
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }

  return data;
}

function normalizeBaseUrl(input) {
  return input.replace(/\/$/, "");
}

function requireValue(name, value) {
  if (!value) {
    throw new Error(`${name} is required.`);
  }
}

function s3Client(config) {
  if (!config.s3 || !config.s3.region || !config.s3.bucket) {
    throw new Error("S3 config is incomplete. Run cc-backup config-s3 first.");
  }

  const options = { region: config.s3.region };
  if (config.s3.accessKeyId && config.s3.secretAccessKey) {
    options.credentials = {
      accessKeyId: config.s3.accessKeyId,
      secretAccessKey: config.s3.secretAccessKey
    };
  }

  return new AWS.S3(options);
}

async function uploadToOwnS3(config, encryptedPayload, checksum) {
  const client = s3Client(config);
  const key = `cc-skill-backup/${config.email}/${Date.now()}.json`;

  await client
    .putObject({
      Bucket: config.s3.bucket,
      Key: key,
      Body: encryptedPayload,
      ContentType: "application/json",
      Metadata: {
        checksum
      }
    })
    .promise();

  config.lastOwnS3Key = key;
  await writeConfig(config);

  return key;
}

async function restoreFromOwnS3(config, key) {
  const client = s3Client(config);
  const targetKey = key || config.lastOwnS3Key;
  if (!targetKey) {
    throw new Error("No backup key found. Pass --key or run a backup first.");
  }

  const out = await client
    .getObject({
      Bucket: config.s3.bucket,
      Key: targetKey
    })
    .promise();

  if (!out.Body) {
    throw new Error("Backup object is empty.");
  }

  return typeof out.Body === "string" ? out.Body : Buffer.from(out.Body).toString("utf8");
}

async function runBackup() {
  const config = await readConfig();
  requireValue("dashboard URL", config.dashboardUrl);
  requireValue("auth token", config.token);
  requireValue("encryption passphrase", config.passphrase);

  const snapshot = await collectClaudeSnapshot();
  if (!Object.keys(snapshot.files).length) {
    throw new Error("No Claude Code config files found in ~/.claude.");
  }

  const encryptedPayload = await encryptJson(snapshot, config.passphrase);
  const checksum = sha256(encryptedPayload);

  if (config.storageMode === "own-s3") {
    const key = await uploadToOwnS3(config, encryptedPayload, checksum);
    console.log(`Backup uploaded to your S3 bucket (${key}).`);
  } else {
    const data = await apiRequest(config.dashboardUrl, "/api/backup/upload", "POST", config.token, {
      encryptedBackup: encryptedPayload,
      checksum
    });
    console.log(`Backup uploaded (${data.backupId}) at ${data.createdAt}.`);
  }
}

async function runRestore(options) {
  const config = await readConfig();
  requireValue("encryption passphrase", config.passphrase);

  let encryptedPayload;

  if (config.storageMode === "own-s3") {
    encryptedPayload = await restoreFromOwnS3(config, options.key);
  } else {
    requireValue("dashboard URL", config.dashboardUrl);
    requireValue("auth token", config.token);
    const route = options.backupId ? `/api/backup/restore?backupId=${options.backupId}` : "/api/backup/restore";
    const data = await apiRequest(config.dashboardUrl, route, "GET", config.token);
    encryptedPayload = data.encryptedBackup;
  }

  const snapshot = await decryptJson(encryptedPayload, config.passphrase);
  const count = await restoreClaudeSnapshot(snapshot);
  console.log(`Restore complete. ${count} files written into ~/.claude.`);
}

program
  .name("cc-backup")
  .description("Encrypted weekly backup for Claude Code config")
  .version("1.0.0");

program
  .command("login")
  .requiredOption("--dashboard <url>", "Dashboard base URL")
  .requiredOption("--email <email>", "Account email")
  .requiredOption("--password <password>", "Account password")
  .option("--passphrase <passphrase>", "Encryption passphrase (generated if omitted)")
  .action(async (options) => {
    try {
      const dashboardUrl = normalizeBaseUrl(options.dashboard);
      const data = await apiRequest(dashboardUrl, "/api/auth/login", "POST", null, {
        email: options.email,
        password: options.password
      });

      const existing = await readConfig();
      const passphrase = options.passphrase || existing.passphrase || crypto.randomBytes(24).toString("hex");

      const nextConfig = {
        ...existing,
        dashboardUrl,
        email: options.email,
        token: data.token,
        passphrase,
        paid: Boolean(data.user?.paid),
        storageMode: existing.storageMode || "hosted"
      };

      await writeConfig(nextConfig);
      console.log(`Logged in as ${options.email}.`);
      console.log(`Storage mode: ${nextConfig.storageMode}.`);
      if (!options.passphrase && !existing.passphrase) {
        console.log(`Generated encryption passphrase saved to ${CONFIG_PATH}. Keep this file safe.`);
      }
    } catch (error) {
      console.error(error.message);
      process.exit(1);
    }
  });

program
  .command("config-s3")
  .requiredOption("--bucket <bucket>", "S3 bucket")
  .requiredOption("--region <region>", "AWS region")
  .option("--access-key-id <id>", "AWS access key id")
  .option("--secret-access-key <key>", "AWS secret access key")
  .action(async (options) => {
    try {
      const config = await readConfig();
      config.storageMode = "own-s3";
      config.s3 = {
        bucket: options.bucket,
        region: options.region,
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey
      };
      await writeConfig(config);
      console.log("Own S3 storage configured. Future backups will upload to your bucket.");
    } catch (error) {
      console.error(error.message);
      process.exit(1);
    }
  });

program
  .command("use-hosted")
  .description("Switch back to hosted backup API storage")
  .action(async () => {
    try {
      const config = await readConfig();
      config.storageMode = "hosted";
      await writeConfig(config);
      console.log("Switched to hosted storage mode.");
    } catch (error) {
      console.error(error.message);
      process.exit(1);
    }
  });

program
  .command("backup")
  .description("Run one encrypted backup now")
  .action(async () => {
    try {
      await runBackup();
    } catch (error) {
      console.error(error.message);
      process.exit(1);
    }
  });

program
  .command("restore")
  .option("--backup-id <id>", "Hosted backup ID")
  .option("--key <s3key>", "Own S3 key")
  .description("Restore latest backup into ~/.claude")
  .action(async (options) => {
    try {
      await runRestore(options);
    } catch (error) {
      console.error(error.message);
      process.exit(1);
    }
  });

program
  .command("schedule")
  .option("--cron <expr>", "Cron expression", "0 3 * * 0")
  .description("Run automated backups in a long-lived process")
  .action(async (options) => {
    try {
      if (!cron.validate(options.cron)) {
        throw new Error(`Invalid cron expression: ${options.cron}`);
      }

      console.log(`Scheduler started with cron: ${options.cron}`);
      console.log("Press Ctrl+C to stop.");

      cron.schedule(options.cron, async () => {
        try {
          await runBackup();
          console.log(`[${nowIso()}] Scheduled backup complete.`);
        } catch (error) {
          console.error(`[${nowIso()}] Scheduled backup failed: ${error.message}`);
        }
      });

      await runBackup();
    } catch (error) {
      console.error(error.message);
      process.exit(1);
    }
  });

program
  .command("status")
  .description("Show current CLI configuration")
  .action(async () => {
    const config = await readConfig();
    if (!Object.keys(config).length) {
      console.log("Not configured. Run cc-backup login first.");
      return;
    }

    console.log(`Dashboard: ${config.dashboardUrl || "not set"}`);
    console.log(`Email: ${config.email || "not set"}`);
    console.log(`Storage mode: ${config.storageMode || "hosted"}`);
    console.log(`Token: ${config.token ? "set" : "missing"}`);
    console.log(`Passphrase: ${config.passphrase ? "set" : "missing"}`);
  });

program.parseAsync(process.argv).catch((error) => {
  console.error(error.message);
  process.exit(1);
});
