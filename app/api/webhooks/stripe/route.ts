import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { upsertPurchase } from "@/lib/storage";

export const runtime = "nodejs";

type StripeCheckoutSession = {
  customer_email?: string;
  customer_details?: {
    email?: string;
  };
};

type StripeWebhookEvent = {
  type: string;
  data?: {
    object?: StripeCheckoutSession;
  };
};

function verifyStripeSignature(payload: string, signatureHeader: string, secret: string): boolean {
  const elements = signatureHeader.split(",").reduce<Record<string, string>>((acc, part) => {
    const [key, value] = part.split("=");
    if (key && value) {
      acc[key] = value;
    }
    return acc;
  }, {});

  const timestamp = elements.t;
  const v1 = elements.v1;

  if (!timestamp || !v1) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`, "utf8").digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(v1, "utf8");

  if (expectedBuf.length !== actualBuf.length) {
    return false;
  }

  return timingSafeEqual(expectedBuf, actualBuf);
}

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not configured." }, { status: 500 });
  }

  const payload = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";

  if (!verifyStripeSignature(payload, signature, secret)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  const event = JSON.parse(payload) as StripeWebhookEvent;

  if (event.type === "checkout.session.completed") {
    const email =
      event.data?.object?.customer_details?.email?.toLowerCase() ||
      event.data?.object?.customer_email?.toLowerCase();

    if (email) {
      await upsertPurchase({
        email,
        paidAt: new Date().toISOString(),
        source: "stripe"
      });
    }
  }

  return NextResponse.json({ received: true });
}
