import { NextRequest, NextResponse } from "next/server";

import {
  ACCESS_COOKIE_NAME,
  createCliToken,
  createSessionToken,
  hasActiveSubscription
} from "@/lib/auth";

export const runtime = "nodejs";

function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12
  });
}

async function issueAccess(emailRaw: string | null, modeRaw: string | null, requestUrl: string) {
  const email = emailRaw?.trim().toLowerCase();
  const mode = modeRaw === "cli" ? "cli" : "session";

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const active = await hasActiveSubscription(email);
  if (!active) {
    return NextResponse.json(
      {
        error:
          "No active subscription found for that email. Complete checkout first, then try again."
      },
      { status: 402 }
    );
  }

  if (mode === "cli") {
    const token = createCliToken(email);
    return NextResponse.json({ token, email });
  }

  const sessionToken = createSessionToken(email);
  const response = NextResponse.json({ ok: true, email, redirectTo: "/dashboard" });
  setSessionCookie(response, sessionToken);
  return response;
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { email?: string; mode?: string }
    | null;

  return issueAccess(body?.email ?? null, body?.mode ?? null, request.url);
}

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");
  const mode = request.nextUrl.searchParams.get("mode");

  const accessResponse = await issueAccess(email, mode, request.url);

  if (mode === "cli" || !accessResponse.ok) {
    return accessResponse;
  }

  const redirectResponse = NextResponse.redirect(new URL("/dashboard", request.url));
  const tokenHeader = accessResponse.headers.get("set-cookie");

  if (tokenHeader) {
    redirectResponse.headers.set("set-cookie", tokenHeader);
  }

  return redirectResponse;
}

export function DELETE(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value: "",
    path: "/",
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax"
  });

  if (request.nextUrl.searchParams.get("redirect") === "1") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}
