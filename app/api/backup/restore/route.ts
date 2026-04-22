import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, hasAccessCookie } from "@/lib/auth";
import { getBackupObject } from "@/lib/s3";
import { latestBackupForUser, listBackupsForUser } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  const hasBearer = Boolean(request.headers.get("authorization")?.startsWith("Bearer "));

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  if (!user.paid || (!hasBearer && !hasAccessCookie(request))) {
    return NextResponse.json({ error: "Paid access required." }, { status: 402 });
  }

  try {
    const backupId = request.nextUrl.searchParams.get("backupId");
    const backups = await listBackupsForUser(user.id);
    const target = backupId ? backups.find((b) => b.id === backupId) : await latestBackupForUser(user.id);

    if (!target) {
      return NextResponse.json({ error: "No backup available for this account." }, { status: 404 });
    }

    const encryptedBackup = await getBackupObject(target.storageKey);

    return NextResponse.json({
      backupId: target.id,
      createdAt: target.createdAt,
      encryptedBackup,
      checksum: target.checksum
    });
  } catch {
    return NextResponse.json({ error: "Restore failed." }, { status: 500 });
  }
}
