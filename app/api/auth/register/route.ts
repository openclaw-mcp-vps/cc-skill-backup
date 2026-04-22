import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { attachAuthCookies } from "@/lib/auth";
import { createUser, getUserByEmail, hasPaidPurchase } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
    }

    if (password.length < 10) {
      return NextResponse.json({ error: "Password must be at least 10 characters." }, { status: 400 });
    }

    const existing = await getUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: "Account already exists. Please log in." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const purchase = await hasPaidPurchase(email);

    const user = await createUser({
      email,
      passwordHash,
      paid: Boolean(purchase),
      paidAt: purchase?.paidAt
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        paid: user.paid,
        paidAt: user.paidAt
      }
    });

    attachAuthCookies(response, user);
    return response;
  } catch {
    return NextResponse.json({ error: "Could not create account." }, { status: 500 });
  }
}
