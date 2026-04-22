import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, hasAccessCookie } from "@/lib/auth";
import { putBackupObject } from "@/lib/s3";
import { addBackupRecord } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  const hasBearer = Boolean(request.headers.get("authorization")?.startsWith("Bearer "));

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  if (!user.paid || (!hasBearer && !hasAccessCookie(request))) {
    return NextResponse.json({ error: "Paid access required." }, { status: 402 });
  }

  try {
    const body = (await request.json()) as {
      encryptedBackup?: string;
      checksum?: string;
    };

    if (!body.encryptedBackup || typeof body.encryptedBackup !== "string") {
      return NextResponse.json({ error: "encryptedBackup is required." }, { status: 400 });
    }

    const storageKey = `${user.id}/${Date.now()}-${randomBytes(6).toString("hex")}.json`;

    await putBackupObject(storageKey, body.encryptedBackup);

    const record = await addBackupRecord({
      userId: user.id,
      storageKey,
      sizeBytes: Buffer.byteLength(body.encryptedBackup, "utf8"),
      checksum: body.checksum
    });

    return NextResponse.json({
      ok: true,
      backupId: record.id,
      createdAt: record.createdAt
    });
  } catch {
    return NextResponse.json({ error: "Backup upload failed." }, { status: 500 });
  }
}
