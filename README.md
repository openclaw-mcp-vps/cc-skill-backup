# CC Skill Backup

CC Skill Backup is a Next.js 15 App Router product + CLI that protects Claude Code configuration.

It provides:
- Encrypted backups of `~/.claude/hooks`, `~/.claude/skills`, `~/.claude/plugins`, and `~/.claude/commands`
- Weekly automation support from the CLI
- Restore on any machine in seconds
- Paywalled access after Stripe checkout
- Hosted storage (S3) or user-owned S3 mode

## Tech Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS v4
- shadcn-style UI components
- Cookie + JWT auth
- File JSON persistence (`data/state.json`)
- AWS S3 (`aws-sdk`) with local fallback for development

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

```bash
cp .env.example .env
```

3. Start development server:

```bash
npm run dev
```

4. Build production bundle:

```bash
npm run build
```

## Required Environment Variables

- `NEXT_PUBLIC_STRIPE_PAYMENT_LINK`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`

Recommended for secure auth + hosted storage:
- `JWT_SECRET`
- `APP_BASE_URL`
- `S3_REGION`
- `S3_BUCKET`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

## Stripe Webhook

Configure your Stripe webhook endpoint to:

```text
POST /api/webhooks/stripe
```

The webhook handler accepts `checkout.session.completed` and marks purchases active by email.

## CLI Install

Hosted install endpoint:

```bash
curl -fsSL https://cc-skill-backup.vercel.app/install.sh | bash
```

Or local script:

```bash
bash scripts/install.sh
```

CLI quick start:

```bash
cc-backup login --dashboard https://cc-skill-backup.vercel.app --email you@example.com --password 'strong-password'
cc-backup backup
cc-backup restore
```

Switch to own S3 bucket:

```bash
cc-backup config-s3 --bucket your-bucket --region us-east-1 --access-key-id AKIA... --secret-access-key ...
cc-backup backup
```

## Health Endpoint

```text
GET /api/health
```

Returns:

```json
{"status":"ok"}
```
