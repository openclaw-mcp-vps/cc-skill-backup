"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";

export function UnlockAccessForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/callback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          mode: "session"
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Unable to verify subscription.");
      }

      window.location.href = "/dashboard";
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Verification failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-[var(--border)] bg-[#0f1726]/80 p-4">
      <label className="text-sm font-medium">Already purchased?</label>
      <input
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@company.com"
        required
        className="w-full rounded-md border border-[var(--border)] bg-[#0d1117] px-3 py-2 text-sm outline-none ring-0 placeholder:text-[#6f7f93] focus:border-[#3e82ff]"
      />
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Checking subscription..." : "Unlock Dashboard"}
      </Button>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </form>
  );
}
