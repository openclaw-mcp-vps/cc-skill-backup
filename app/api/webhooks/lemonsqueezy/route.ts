import { NextRequest, NextResponse } from "next/server";
import { upsertPurchase } from "@/lib/storage";

export const runtime = "nodejs";

type LemonSqueezyOrderEvent = {
  meta?: {
    event_name?: string;
  };
  data?: {
    attributes?: {
      user_email?: string;
      created_at?: string;
    };
  };
};

export async function POST(request: NextRequest) {
  const event = (await request.json()) as LemonSqueezyOrderEvent;

  if (event.meta?.event_name !== "order_created") {
    return NextResponse.json({ received: true });
  }

  const email = event.data?.attributes?.user_email?.toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Missing user email." }, { status: 400 });
  }

  await upsertPurchase({
    email,
    paidAt: event.data?.attributes?.created_at ?? new Date().toISOString(),
    source: "lemonsqueezy"
  });

  return NextResponse.json({ received: true });
}
