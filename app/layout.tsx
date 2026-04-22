import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk"
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono"
});

export const metadata: Metadata = {
  title: "CC Skill Backup — Encrypted weekly Claude Code backup",
  description:
    "Auto-backup your ~/.claude hooks, skills, plugins, and commands to encrypted S3 weekly. Restore a full Claude Code setup in seconds on any machine.",
  metadataBase: new URL("https://cc-skill-backup.vercel.app"),
  openGraph: {
    title: "CC Skill Backup",
    description:
      "Encrypted weekly Claude Code backups to S3 with one-click restore on any new machine.",
    url: "https://cc-skill-backup.vercel.app",
    siteName: "CC Skill Backup",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "CC Skill Backup dashboard preview"
      }
    ],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "CC Skill Backup",
    description:
      "Auto-backup your ~/.claude config weekly and restore in seconds.",
    images: ["/og-image.svg"]
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
