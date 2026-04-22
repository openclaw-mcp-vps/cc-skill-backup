import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { attachAuthCookies, signSession } from "@/lib/auth";
import { getUserByEmail, hasPaidPurchase, updateUser } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";

    if (!email || !email.includes("@") || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    let effectiveUser = user;
    if (!effectiveUser.paid) {
      const purchase = await hasPaidPurchase(email);
      if (purchase) {
        const updated = await updateUser(effectiveUser.id, { paid: true, paidAt: purchase.paidAt });
        if (updated) {
          effectiveUser = updated;
        }
      }
    }

    const response = NextResponse.json({
      user: {
        id: effectiveUser.id,
        email: effectiveUser.email,
        paid: effectiveUser.paid,
        paidAt: effectiveUser.paidAt
      },
      token: signSession({
        userId: effectiveUser.id,
        email: effectiveUser.email,
        paid: effectiveUser.paid
      })
    });

    attachAuthCookies(response, effectiveUser);
    return response;
  } catch {
    return NextResponse.json({ error: "Could not login." }, { status: 500 });
  }
}
