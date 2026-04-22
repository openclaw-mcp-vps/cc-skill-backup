"use client";

import { useEffect, useState } from "react";
import { Clock3, DatabaseBackup, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type BackupItem = {
  id: string;
  createdAt: string;
  sizeBytes: number;
  checksum?: string;
};

function prettySize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BackupHistory() {
  const [items, setItems] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/backup/history", { credentials: "include" });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error ?? "Failed to load backup history.");
        }

        setItems(data.backups ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load backup history.");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DatabaseBackup className="h-5 w-5 text-emerald-400" />
          Backup History
        </CardTitle>
        <CardDescription>Every payload is encrypted on your machine before upload.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? <p className="text-sm text-zinc-400">Loading backup timeline…</p> : null}
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        {!loading && !error && items.length === 0 ? (
          <p className="text-sm text-zinc-400">
            No backups yet. Run <code className="rounded bg-zinc-900 px-1.5 py-0.5">cc-backup backup</code> after login.
          </p>
        ) : null}
        {!loading && !error
          ? items.map((item) => (
              <div key={item.id} className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm text-zinc-200">
                    <Clock3 className="h-4 w-4 text-zinc-400" />
                    {new Date(item.createdAt).toLocaleString()}
                  </div>
                  <div className="text-xs text-zinc-400">{prettySize(item.sizeBytes)}</div>
                </div>
                {item.checksum ? (
                  <div className="mt-2 flex items-center gap-1 text-xs text-zinc-400">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                    SHA256: {item.checksum}
                  </div>
                ) : null}
              </div>
            ))
          : null}
      </CardContent>
    </Card>
  );
}
