import { createHmac, timingSafeEqual } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { upsertSubscription } from "@/lib/data-store";
import type { SubscriptionStatus } from "@/lib/types";

export const runtime = "nodejs";

interface LemonWebhookBody {
  meta?: {
    event_name?: string;
    custom_data?: {
      email?: string;
    };
  };
  data?: {
    id?: string;
    attributes?: {
      status?: string;
      user_email?: string;
      customer_email?: string;
      first_subscription_item?: {
        subscription_id?: number;
      };
    };
  };
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function verifyWebhookSignature(rawBody: string, request: NextRequest) {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    return true;
  }

  const providedSignature =
    request.headers.get("x-signature") ?? request.headers.get("x-signature-sha256");

  if (!providedSignature) {
    return false;
  }

  const expectedHex = createHmac("sha256", secret).update(rawBody).digest("hex");
  const signaturesToMatch = [expectedHex, `sha256=${expectedHex}`];

  return signaturesToMatch.some((value) => safeCompare(value, providedSignature));
}

function mapSubscriptionStatus(eventName: string, lemonStatus?: string): SubscriptionStatus {
  const normalizedEvent = eventName.toLowerCase();
  const normalizedStatus = (lemonStatus ?? "").toLowerCase();

  if (
    normalizedEvent.includes("cancel") ||
    normalizedEvent.includes("expired") ||
    normalizedEvent.includes("paused")
  ) {
    return "inactive";
  }

  if (
    ["cancelled", "expired", "past_due", "unpaid", "paused"].includes(normalizedStatus)
  ) {
    return "inactive";
  }

  return "active";
}

function extractEmail(payload: LemonWebhookBody) {
  return (
    payload.data?.attributes?.user_email ??
    payload.data?.attributes?.customer_email ??
    payload.meta?.custom_data?.email ??
    null
  );
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  if (!verifyWebhookSignature(rawBody, request)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  const body = JSON.parse(rawBody) as LemonWebhookBody;

  const email = extractEmail(body);
  if (!email) {
    return NextResponse.json(
      { error: "Webhook payload missing customer email." },
      { status: 400 }
    );
  }

  const eventName = body.meta?.event_name ?? "unknown";
  const status = mapSubscriptionStatus(eventName, body.data?.attributes?.status);

  const lemonSubscriptionId =
    body.data?.attributes?.first_subscription_item?.subscription_id?.toString() ??
    body.data?.id;

  await upsertSubscription({
    email: email.trim().toLowerCase(),
    status,
    lemonCustomerId: body.data?.id,
    lemonSubscriptionId,
    updatedAt: new Date().toISOString()
  });

  return NextResponse.json({ ok: true, eventName, status });
}
