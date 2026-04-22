"use client";

import { FormEvent, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, KeyRound, LogOut, RefreshCw } from "lucide-react";
import { BackupHistory } from "@/components/BackupHistory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

type DashboardUser = {
  id: string;
  email: string;
  paid: boolean;
  paidAt?: string;
};

type Props = {
  initialUser: DashboardUser | null;
};

export function Dashboard({ initialUser }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<DashboardUser | null>(initialUser);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ?? "";

  const commandBlock = useMemo(
    () => [
      "curl -fsSL https://cc-skill-backup.vercel.app/install.sh | bash",
      "cc-backup login --dashboard https://cc-skill-backup.vercel.app",
      "cc-backup backup",
      "cc-backup restore"
    ],
    []
  );

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Authentication failed.");
      }

      setUser(data.user as DashboardUser);
      setPassword("");
      setMessage(mode === "login" ? "Signed in." : "Account created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  async function refreshAccess() {
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/auth/me?refresh=1", {
        method: "GET",
        credentials: "include"
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Could not refresh account status.");
      }

      setUser(data.user as DashboardUser);
      setMessage(
        data.user.paid
          ? "Payment confirmed. Access unlocked."
          : "Payment not found yet. Stripe webhooks usually sync in under a minute."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not refresh account status.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include"
      });
      setUser(null);
      setEmail("");
      setPassword("");
      setMessage("Signed out.");
    } catch {
      setError("Could not sign out.");
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return (
      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <CardTitle>Account Access</CardTitle>
          <CardDescription>Sign in to manage backups and unlock restore access on new machines.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex gap-2">
            <Button variant={mode === "login" ? "default" : "secondary"} onClick={() => setMode("login")}>
              Login
            </Button>
            <Button variant={mode === "register" ? "default" : "secondary"} onClick={() => setMode("register")}>
              Register
            </Button>
          </div>

          <form onSubmit={submitAuth} className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-300" htmlFor="email">
                Email
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@team.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-300" htmlFor="password">
                Password
              </label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder="At least 10 characters"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={10}
              />
            </div>
            <Button type="submit" disabled={busy} className="w-full">
              <KeyRound className="mr-2 h-4 w-4" />
              {busy ? "Working…" : mode === "login" ? "Sign In" : "Create Account"}
            </Button>
          </form>

          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Welcome back</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={user.paid ? "default" : "secondary"}>{user.paid ? "Pro Active" : "Free"}</Badge>
              <Button variant="ghost" onClick={logout} disabled={busy}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!user.paid ? (
            <>
              <p className="text-sm text-zinc-300">
                Weekly backups and restore APIs are locked until payment is confirmed for this account.
              </p>
              <div className="rounded-lg border border-emerald-800/50 bg-emerald-950/20 p-4">
                <h3 className="font-medium text-emerald-200">Unlock CC Skill Backup Pro for $5/month</h3>
                <p className="mt-1 text-sm text-emerald-100/80">
                  Includes automatic weekly encrypted backups, unlimited restore, and S3 fallback routing.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a href={paymentLink} target="_blank" rel="noreferrer" className="inline-flex">
                    <Button>
                      Buy on Stripe
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </a>
                  <Button variant="secondary" onClick={refreshAccess} disabled={busy}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    I already paid
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-lg border border-emerald-800/50 bg-emerald-950/20 p-4 text-sm text-emerald-100">
                <p className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  Paid access active. CLI backups and restore are unlocked.
                </p>
                {user.paidAt ? <p className="mt-1 text-emerald-100/75">Activated {new Date(user.paidAt).toLocaleString()}</p> : null}
              </div>
              <Separator />
              <div>
                <h3 className="mb-2 font-medium text-zinc-200">Install + First Backup</h3>
                <pre className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-xs text-zinc-200">
                  {commandBlock.join("\n")}
                </pre>
              </div>
            </>
          )}
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
        </CardContent>
      </Card>

      {user.paid ? <BackupHistory /> : null}
    </div>
  );
}
