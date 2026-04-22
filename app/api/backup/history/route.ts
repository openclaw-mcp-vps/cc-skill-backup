import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, hasAccessCookie } from "@/lib/auth";
import { listBackupsForUser } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  if (!user.paid || !hasAccessCookie(request)) {
    return NextResponse.json({ error: "Paid access required." }, { status: 402 });
  }

  const backups = await listBackupsForUser(user.id);
  return NextResponse.json({
    backups: backups.map((backup) => ({
      id: backup.id,
      createdAt: backup.createdAt,
      sizeBytes: backup.sizeBytes,
      checksum: backup.checksum
    }))
  });
}
