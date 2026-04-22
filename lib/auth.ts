import jwt from "jsonwebtoken";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getUserById, hasPaidPurchase, updateUser } from "@/lib/storage";
import { SessionPayload, UserRecord } from "@/lib/types";

const SESSION_COOKIE = "ccsb_session";
const ACCESS_COOKIE = "ccsb_access";

function secret() {
  return process.env.JWT_SECRET ?? "local-dev-secret-change-me";
}

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, secret(), { expiresIn: "30d" });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, secret()) as SessionPayload;
  } catch {
    return null;
  }
}

export function attachAuthCookies(response: NextResponse, user: UserRecord) {
  const token = signSession({
    userId: user.id,
    email: user.email,
    paid: user.paid
  });

  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });

  if (user.paid) {
    response.cookies.set(ACCESS_COOKIE, "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });
  } else {
    response.cookies.delete(ACCESS_COOKIE);
  }
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(ACCESS_COOKIE);
}

export async function getAuthenticatedUser(request: NextRequest): Promise<UserRecord | null> {
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : null;
  const token = bearer ?? request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const session = verifySession(token);
  if (!session) {
    return null;
  }

  const user = await getUserById(session.userId);
  if (!user) {
    return null;
  }

  if (!user.paid) {
    const purchase = await hasPaidPurchase(user.email);
    if (purchase) {
      const updated = await updateUser(user.id, { paid: true, paidAt: purchase.paidAt });
      return updated;
    }
  }

  return user;
}

export function hasAccessCookie(request: NextRequest): boolean {
  return request.cookies.get(ACCESS_COOKIE)?.value === "1";
}

export const authCookieNames = {
  session: SESSION_COOKIE,
  access: ACCESS_COOKIE
};
