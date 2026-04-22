import Link from "next/link";
import { ArrowRight, CheckCircle2, CloudUpload, Lock, RotateCw, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const faqs = [
  {
    q: "What gets backed up?",
    a: "CC Skill Backup captures your ~/.claude/hooks, ~/.claude/skills, ~/.claude/plugins, and ~/.claude/commands directories by default."
  },
  {
    q: "Is data encrypted before upload?",
    a: "Yes. The CLI encrypts your payload on-device with AES-256-GCM before anything leaves your machine."
  },
  {
    q: "Can I use my own S3 bucket?",
    a: "Yes. Configure your bucket in the CLI and keep full control over storage location and retention policies."
  },
  {
    q: "How long does restore take on a new machine?",
    a: "For typical Claude Code setups, restore takes under 10 seconds once you authenticate."
  }
];

export default function HomePage() {
  const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ?? "";

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="animate-rise">
        <nav className="mb-14 flex items-center justify-between rounded-full border border-zinc-800 bg-zinc-950/60 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <span className="font-medium tracking-tight">CC Skill Backup</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="text-sm text-zinc-300 hover:text-white">
              Dashboard
            </Link>
            <a href={paymentLink} target="_blank" rel="noreferrer">
              <Button size="sm">Buy $5/mo</Button>
            </a>
          </div>
        </nav>
      </header>

      <section className="animate-rise-delay grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Badge>Backup Tools</Badge>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
            CC Skill Backup auto-protects your Claude Code stack every week.
          </h1>
          <p className="max-w-2xl text-lg text-zinc-300">
            One install command. Encrypted snapshots of hooks, skills, plugins, and commands. Move to a new
            machine and restore your full setup in seconds.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href={paymentLink} target="_blank" rel="noreferrer">
              <Button size="lg">
                Get Pro for $5/mo
                <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
            <Link href="/dashboard">
              <Button variant="secondary" size="lg">
                Open Dashboard
              </Button>
            </Link>
          </div>
          <pre className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-200">
            {`curl -fsSL https://cc-skill-backup.vercel.app/install.sh | bash\ncc-backup login --dashboard https://cc-skill-backup.vercel.app\ncc-backup backup`}
          </pre>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Why people pay</CardTitle>
            <CardDescription>Heavy Claude Code users lose weeks rebuilding config after machine failure.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-zinc-300">
            <div className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/70 p-3">
              <CloudUpload className="mt-0.5 h-4 w-4 text-emerald-400" />
              <p>Weekly automatic encrypted snapshots mean your custom workflows are never a single-disk risk.</p>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/70 p-3">
              <RotateCw className="mt-0.5 h-4 w-4 text-blue-400" />
              <p>Onboard a new laptop with one restore command and keep coding in minutes, not days.</p>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/70 p-3">
              <Lock className="mt-0.5 h-4 w-4 text-cyan-400" />
              <p>Backup payloads are encrypted before upload and can be routed to your own S3 bucket.</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-16 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-emerald-400" />
              Problem
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-300">
              Claude Code power users invest dozens of hours building custom hooks and skills. A failed SSD wipes it all.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Solution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-300">
              CC Skill Backup keeps an encrypted weekly history and one-command restore path across machines.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowRight className="h-4 w-4 text-emerald-400" />
              ROI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-300">
              $5/month prevents repeated setup tax and protects the most valuable part of your Claude Code workflow.
            </p>
          </CardContent>
        </Card>
      </section>

      <section id="pricing" className="mt-16">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="text-2xl">Simple Pricing</CardTitle>
            <CardDescription>One plan for serious Claude Code users.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-2">
              <span className="text-4xl font-semibold text-zinc-50">$5</span>
              <span className="pb-1 text-zinc-400">/month</span>
            </div>
            <ul className="space-y-2 text-sm text-zinc-300">
              <li>Weekly encrypted auto-backups</li>
              <li>Instant restore to any machine</li>
              <li>Use your own S3 bucket or hosted storage</li>
              <li>Backup history and integrity checksum tracking</li>
            </ul>
            <a href={paymentLink} target="_blank" rel="noreferrer" className="inline-flex">
              <Button size="lg" className="w-full sm:w-auto">
                Start Backing Up Today
                <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
          </CardContent>
        </Card>
      </section>

      <section className="mt-16">
        <h2 className="mb-4 text-2xl font-semibold text-zinc-50">FAQ</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {faqs.map((faq) => (
            <Card key={faq.q}>
              <CardHeader>
                <CardTitle className="text-base">{faq.q}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-300">{faq.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
