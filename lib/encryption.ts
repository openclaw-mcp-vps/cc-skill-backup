import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

export type EncryptedBlob = {
  ciphertext: string;
  iv: string;
  authTag: string;
  salt: string;
  algorithm: "aes-256-gcm";
};

function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return scryptSync(passphrase, salt, 32);
}

export function encryptText(content: string, passphrase: string): EncryptedBlob {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = deriveKey(passphrase, salt);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([cipher.update(content, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    salt: salt.toString("base64"),
    algorithm: "aes-256-gcm"
  };
}

export function decryptText(blob: EncryptedBlob, passphrase: string): string {
  const key = deriveKey(passphrase, Buffer.from(blob.salt, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(blob.iv, "base64"));
  decipher.setAuthTag(Buffer.from(blob.authTag, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(blob.ciphertext, "base64")),
    decipher.final()
  ]);

  return decrypted.toString("utf8");
}
