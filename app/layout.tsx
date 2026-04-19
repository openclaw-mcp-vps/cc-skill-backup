import type { Metadata } from "next";
import Script from "next/script";

import "@/app/globals.css";

const fallbackBase = "https://cc-skill-backup.com";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? fallbackBase),
  title: "CC Skill Backup — Encrypted Weekly Claude Code Backups",
  description:
    "Auto-backup your ~/.claude config to encrypted S3 every week. Restore hooks, skills, plugins, and commands on any machine in seconds.",
  keywords: [
    "Claude Code backup",
    "Claude skills backup",
    "encrypted config backup",
    "S3 backup",
    "developer tooling"
  ],
  openGraph: {
    title: "CC Skill Backup",
    description:
      "Encrypted weekly backups for ~/.claude so your hooks, skills, plugins, and commands survive every machine migration.",
    url: "/",
    siteName: "CC Skill Backup",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "CC Skill Backup",
    description:
      "Keep your Claude Code setup safe with encrypted weekly backups and one-command restore."
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0d1117] text-zinc-100 antialiased">
        <Script
          id="lemonsqueezy-script"
          strategy="afterInteractive"
          src="https://app.lemonsqueezy.com/js/lemon.js"
        />
        {children}
      </body>
    </html>
  );
}
