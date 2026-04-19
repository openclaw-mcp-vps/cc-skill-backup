import { NextRequest, NextResponse } from "next/server";

import { authenticateFromHeaders } from "@/lib/auth";
import { readHostedBackup } from "@/lib/backup-store";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const identity = await authenticateFromHeaders(request.headers);
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const backupId = request.nextUrl.searchParams.get("id") ?? undefined;

  const result = await readHostedBackup({
    email: identity.email,
    backupId
  });

  if (!result) {
    return NextResponse.json(
      { error: "No backup found for this account." },
      { status: 404 }
    );
  }

  return new NextResponse(result.payload, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename=claude-backup-${result.record.id}.enc`,
      "X-Backup-Id": result.record.id,
      "X-Backup-Created-At": result.record.createdAt,
      "Cache-Control": "no-store"
    }
  });
}
