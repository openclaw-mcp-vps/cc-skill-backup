import { NextRequest, NextResponse } from "next/server";

import { authenticateFromHeaders } from "@/lib/auth";
import { saveHostedBackup } from "@/lib/backup-store";

export const runtime = "nodejs";

function machineNameFromHeaders(request: NextRequest) {
  return (
    request.headers.get("x-machine-name") ??
    request.headers.get("x-forwarded-host") ??
    "unknown-machine"
  );
}

export async function POST(request: NextRequest) {
  const identity = await authenticateFromHeaders(request.headers);
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: Buffer;

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as
      | { encryptedPayloadBase64?: string }
      | null;

    if (!body?.encryptedPayloadBase64) {
      return NextResponse.json(
        { error: "Missing encryptedPayloadBase64 in request body." },
        { status: 400 }
      );
    }

    payload = Buffer.from(body.encryptedPayloadBase64, "base64");
  } else {
    const arrayBuffer = await request.arrayBuffer();
    payload = Buffer.from(arrayBuffer);
  }

  if (payload.length === 0) {
    return NextResponse.json({ error: "Empty backup payload." }, { status: 400 });
  }

  const record = await saveHostedBackup({
    email: identity.email,
    payload,
    machineName: machineNameFromHeaders(request)
  });

  return NextResponse.json({
    backupId: record.id,
    createdAt: record.createdAt,
    sizeBytes: record.sizeBytes,
    checksumSha256: record.checksumSha256
  });
}
