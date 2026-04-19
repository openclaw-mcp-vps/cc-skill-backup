"use client";

import { useMemo, useState } from "react";
import { Copy, Download, UploadCloud, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BackupRecord } from "@/lib/types";

interface DashboardProps {
  email: string;
  appUrl: string;
  cliToken: string;
  latestBackup: BackupRecord | null;
}

export function Dashboard({ email, appUrl, cliToken, latestBackup }: DashboardProps) {
  const [copyState, setCopyState] = useState<string | null>(null);

  const installCommand = useMemo(() => {
    return `npx cc-skill-backup install --app-url ${appUrl} --email ${email} --token '${cliToken}'`;
  }, [appUrl, cliToken, email]);

  const backupCommand = "npx cc-skill-backup backup";
  const restoreCommand = "npx cc-skill-backup restore";

  async function copyValue(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopyState(label);
    window.setTimeout(() => setCopyState(null), 1400);
  }

  async function signOut() {
    await fetch("/api/auth/callback", { method: "DELETE" });
    window.location.href = "/";
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-10 md:px-6">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Backup Dashboard</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Signed in as {email}. Your CLI token is preloaded in the install command below.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge>Paid Access Active</Badge>
          <Button variant="outline" onClick={signOut}>
            Sign Out
          </Button>
        </div>
      </div>

      <section className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Install CLI</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-[var(--muted)]">
              One command stores config, adds weekly cron, and validates your account token.
            </p>
            <pre className="overflow-x-auto rounded-md border border-[var(--border)] bg-[#0d1117] p-3 text-xs">
              <code>{installCommand}</code>
            </pre>
            <Button variant="secondary" className="w-full" onClick={() => copyValue("install", installCommand)}>
              <Copy className="mr-2 h-4 w-4" />
              {copyState === "install" ? "Copied" : "Copy Install Command"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Manual Backup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-[var(--muted)]">
              Trigger a backup instantly after editing hooks, skills, or plugin scripts.
            </p>
            <pre className="rounded-md border border-[var(--border)] bg-[#0d1117] p-3 text-xs">
              <code>{backupCommand}</code>
            </pre>
            <Button variant="secondary" className="w-full" onClick={() => copyValue("backup", backupCommand)}>
              <UploadCloud className="mr-2 h-4 w-4" />
              {copyState === "backup" ? "Copied" : "Copy Backup Command"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Restore to New Machine</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-[var(--muted)]">
              Pull latest encrypted snapshot and restore ~/.claude in one command.
            </p>
            <pre className="rounded-md border border-[var(--border)] bg-[#0d1117] p-3 text-xs">
              <code>{restoreCommand}</code>
            </pre>
            <Button variant="secondary" className="w-full" onClick={() => copyValue("restore", restoreCommand)}>
              <Download className="mr-2 h-4 w-4" />
              {copyState === "restore" ? "Copied" : "Copy Restore Command"}
            </Button>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Latest Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {latestBackup ? (
            <>
              <p>
                <strong>Created:</strong> {new Date(latestBackup.createdAt).toLocaleString()}
              </p>
              <p>
                <strong>Machine:</strong> {latestBackup.machineName}
              </p>
              <p>
                <strong>Provider:</strong> {latestBackup.provider}
              </p>
              <p>
                <strong>Size:</strong> {(latestBackup.sizeBytes / 1024).toFixed(1)} KB
              </p>
              <p className="truncate">
                <strong>Checksum:</strong> {latestBackup.checksumSha256}
              </p>
            </>
          ) : (
            <div className="flex items-start gap-2 text-[var(--muted)]">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-[#89bbff]" />
              <p>
                No snapshots yet. Run the install command above, set your encryption key, and the first weekly
                backup will be scheduled automatically.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
