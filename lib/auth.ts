import jwt from "jsonwebtoken";

import { getSubscriptionByEmail } from "@/lib/data-store";

export const ACCESS_COOKIE_NAME = "cc_skill_backup_access";

export interface AccessTokenPayload {
  email: string;
  scope: "session" | "cli";
}

function getJwtSecret() {
  return process.env.JWT_SECRET ?? "cc-skill-backup-local-secret";
}

export function createSessionToken(email: string) {
  return jwt.sign({ email, scope: "session" }, getJwtSecret(), {
    expiresIn: "12h"
  });
}

export function createCliToken(email: string) {
  return jwt.sign({ email, scope: "cli" }, getJwtSecret(), {
    expiresIn: "180d"
  });
}

export function verifyToken(token: string): AccessTokenPayload | null {
  try {
    const payload = jwt.verify(token, getJwtSecret()) as AccessTokenPayload;
    if (!payload?.email || !payload?.scope) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function hasActiveSubscription(email: string) {
  const subscription = await getSubscriptionByEmail(email);
  return subscription?.status === "active";
}

function extractBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return null;
  }

  return token;
}

function extractCookieToken(cookieHeader: string | null): string | null {
  if (!cookieHeader) {
    return null;
  }

  const tokens = cookieHeader.split(";").map((token) => token.trim());
  const cookieValue = tokens
    .map((token) => token.split("="))
    .find(([key]) => key === ACCESS_COOKIE_NAME);

  if (!cookieValue || cookieValue.length < 2) {
    return null;
  }

  return decodeURIComponent(cookieValue.slice(1).join("="));
}

export async function authenticateFromHeaders(
  headers: Headers
): Promise<AccessTokenPayload | null> {
  const authorizationHeader = headers.get("authorization");
  const cookieHeader = headers.get("cookie");

  const token = extractBearerToken(authorizationHeader) ?? extractCookieToken(cookieHeader);

  if (!token) {
    return null;
  }

  const payload = verifyToken(token);
  if (!payload) {
    return null;
  }

  const isActive = await hasActiveSubscription(payload.email);
  return isActive ? payload : null;
}
