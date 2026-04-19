import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const MAGIC_HEADER = Buffer.from("CCSB01", "utf8");
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function deriveKey(passphrase: string, salt: Buffer) {
  return scryptSync(passphrase, salt, 32);
}

export function encryptBuffer(payload: Buffer, passphrase: string): Buffer {
  if (!passphrase || passphrase.length < 12) {
    throw new Error("Encryption key must be at least 12 characters.");
  }

  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const key = deriveKey(passphrase, salt);

  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(payload), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([MAGIC_HEADER, salt, iv, authTag, ciphertext]);
}

export function decryptBuffer(payload: Buffer, passphrase: string): Buffer {
  if (payload.length < MAGIC_HEADER.length + SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error("Backup payload is not valid.");
  }

  const offsetMagic = MAGIC_HEADER.length;
  const header = payload.subarray(0, offsetMagic);

  if (!header.equals(MAGIC_HEADER)) {
    throw new Error("Unexpected backup format.");
  }

  const saltStart = offsetMagic;
  const saltEnd = saltStart + SALT_LENGTH;
  const ivEnd = saltEnd + IV_LENGTH;
  const tagEnd = ivEnd + AUTH_TAG_LENGTH;

  const salt = payload.subarray(saltStart, saltEnd);
  const iv = payload.subarray(saltEnd, ivEnd);
  const authTag = payload.subarray(ivEnd, tagEnd);
  const encrypted = payload.subarray(tagEnd);

  const key = deriveKey(passphrase, salt);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}
