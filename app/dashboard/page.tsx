import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { Dashboard } from "@/components/Dashboard";
import { ACCESS_COOKIE_NAME, createCliToken, hasActiveSubscription, verifyToken } from "@/lib/auth";
import { getLatestBackupForEmail } from "@/lib/data-store";

function detectBaseUrl(hostHeader: string | null, forwardedProto: string | null) {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  const host = hostHeader ?? "localhost:3000";
  const protocol = forwardedProto ?? (host.includes("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  if (!token) {
    redirect("/");
  }

  const payload = verifyToken(token);
  if (!payload) {
    redirect("/");
  }

  const hasAccess = await hasActiveSubscription(payload.email);
  if (!hasAccess) {
    redirect("/");
  }

  const latestBackup = await getLatestBackupForEmail(payload.email);
  const requestHeaders = await headers();
  const appUrl = detectBaseUrl(
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
    requestHeaders.get("x-forwarded-proto")
  );
  const cliToken = createCliToken(payload.email);

  return (
    <Dashboard
      email={payload.email}
      appUrl={appUrl}
      cliToken={cliToken}
      latestBackup={latestBackup}
    />
  );
}
