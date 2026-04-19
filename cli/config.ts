import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export interface CliConfig {
  email?: string;
  token?: string;
  appUrl?: string;
  encryptionKey?: string;
  sourcePath?: string;
  destinationPath?: string;
  s3Bucket?: string;
  s3Region?: string;
  s3Prefix?: string;
}

const CONFIG_DIR = path.join(os.homedir(), ".cc-skill-backup");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

export function getConfigPath() {
  return CONFIG_PATH;
}

export function getConfigDir() {
  return CONFIG_DIR;
}

export function expandHomePath(inputPath: string) {
  if (inputPath === "~") {
    return os.homedir();
  }

  if (inputPath.startsWith("~/")) {
    return path.join(os.homedir(), inputPath.slice(2));
  }

  return inputPath;
}

export async function ensureConfigDir() {
  await mkdir(CONFIG_DIR, { recursive: true });
}

export async function configExists() {
  try {
    await access(CONFIG_PATH);
    return true;
  } catch {
    return false;
  }
}

export async function loadConfig(): Promise<CliConfig> {
  const exists = await configExists();
  if (!exists) {
    return {};
  }

  try {
    const raw = await readFile(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw) as CliConfig;
    return parsed ?? {};
  } catch {
    return {};
  }
}

export async function saveConfig(config: CliConfig) {
  await ensureConfigDir();
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
}
