import { NextRequest, NextResponse } from "next/server";
import { attachAuthCookies, getAuthenticatedUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

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
}
