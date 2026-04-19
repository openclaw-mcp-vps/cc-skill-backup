import { ArrowRight, Clock3, CloudUpload, TerminalSquare } from "lucide-react";

import { PricingCard } from "@/components/PricingCard";
import { UnlockAccessForm } from "@/components/UnlockAccessForm";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

const installSnippet = "npx cc-skill-backup install --email you@company.com";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
      <section className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[#112037] via-[#0f1a2b] to-[#0d1117] p-8 md:p-12">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-[#2f78ff]/20 blur-3xl" />
        <Badge className="mb-4">Backup Tools</Badge>
        <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight md:text-5xl">
          CC Skill Backup keeps your <code>~/.claude/</code> setup safe with encrypted weekly snapshots.
        </h1>
        <p className="mt-5 max-w-2xl text-base text-zinc-300 md:text-lg">
          Hooks, skills, plugins, and commands are your competitive edge. This tool encrypts your full Claude
          Code config and stores it in S3 so a machine crash never costs you a week of reconfiguration.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-[var(--border)] bg-[#0d1117]/70 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#89bbff]">One-line install</p>
            <pre className="overflow-x-auto text-sm">
              <code>{installSnippet}</code>
            </pre>
          </div>
          <UnlockAccessForm />
        </div>
      </section>

      <section className="mt-14 grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 p-5">
          <Clock3 className="mb-3 h-5 w-5 text-[#89bbff]" />
          <h2 className="text-lg font-semibold">The Problem</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Heavy Claude Code users spend hours tuning workflows, then lose everything on a laptop migration or
            accidental deletion.
          </p>
        </article>
        <article className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 p-5">
          <CloudUpload className="mb-3 h-5 w-5 text-[#89bbff]" />
          <h2 className="text-lg font-semibold">The Solution</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Weekly encrypted backups, direct S3 support, hosted fallback storage, and instant restore commands for
            every new machine.
          </p>
        </article>
        <article className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 p-5">
          <TerminalSquare className="mb-3 h-5 w-5 text-[#89bbff]" />
          <h2 className="text-lg font-semibold">Built for Power Users</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            If you maintain 10+ custom hooks and skills, this is the fastest safety net you can deploy for $5/mo.
          </p>
        </article>
      </section>

      <section className="mt-14 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">How it works</h2>
          <ol className="space-y-4 text-sm text-zinc-300">
            <li className="rounded-lg border border-[var(--border)] bg-[#0e1522] p-4">
              1. Buy once through Lemon Squeezy and verify your checkout email.
            </li>
            <li className="rounded-lg border border-[var(--border)] bg-[#0e1522] p-4">
              2. Copy your personalized install command from the dashboard.
            </li>
            <li className="rounded-lg border border-[var(--border)] bg-[#0e1522] p-4">
              3. CLI encrypts and uploads your <code>~/.claude/</code> config weekly.
            </li>
            <li className="rounded-lg border border-[var(--border)] bg-[#0e1522] p-4">
              4. On a new machine, run restore and continue coding in seconds.
            </li>
          </ol>
          <a href="#pricing" className="inline-flex items-center text-sm font-semibold text-[#8ab7ff] hover:text-[#b8d5ff]">
            See pricing <ArrowRight className="ml-2 h-4 w-4" />
          </a>
        </div>
        <div id="pricing" className="flex justify-center lg:justify-end">
          <PricingCard />
        </div>
      </section>

      <section className="mt-14 rounded-2xl border border-[var(--border)] bg-[#101a2a]/80 p-6 md:p-8">
        <h2 className="text-2xl font-bold tracking-tight">FAQ</h2>
        <Accordion type="single" collapsible className="mt-4">
          <AccordionItem value="item-1">
            <AccordionTrigger>What exactly gets backed up?</AccordionTrigger>
            <AccordionContent>
              The CLI archives your entire <code>~/.claude/</code> tree, including hooks, skills, plugins,
              commands, and other local config files you depend on daily.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Is backup encryption done locally?</AccordionTrigger>
            <AccordionContent>
              Yes. The archive is encrypted on your machine with AES-256-GCM before upload. Stored payloads are
              opaque encrypted blobs.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger>Can I use my own S3 bucket?</AccordionTrigger>
            <AccordionContent>
              Yes. Pass S3 bucket and region options in the CLI and backups are sent directly to your account
              instead of hosted storage.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>
    </main>
  );
}
