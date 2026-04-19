# Build Task: cc-skill-backup

Build a complete, production-ready Next.js 15 App Router application.

PROJECT: cc-skill-backup
HEADLINE: CC Skill Backup — auto-backup your ~/.claude/ config to encrypted S3 weekly
WHAT: One-line install command, encrypted backup of hooks/skills/plugins/commands to your S3 or ours every week. Restore on any new machine in seconds.
WHY: Claude Code users spend hours customizing. Losing the config = weeks of re-setup. Dropbox-for-CC is a no-brainer subscription.
WHO PAYS: Heavy Claude Code users with 10+ custom skills/hooks
NICHE: backup-tools
PRICE: $$5/mo/mo

ARCHITECTURE SPEC:
A Next.js web app with a CLI tool that encrypts and backs up ~/.claude/ configs to S3 weekly. Users install via npm, authenticate through the web dashboard, and can restore configs on new machines with a single command.

PLANNED FILES:
- pages/api/auth/callback.js
- pages/api/backup/upload.js
- pages/api/backup/download.js
- pages/api/subscription/webhook.js
- pages/dashboard.js
- pages/index.js
- cli/backup.js
- cli/restore.js
- cli/install.js
- lib/encryption.js
- lib/s3.js
- lib/auth.js
- components/Dashboard.js
- components/PricingCard.js

DEPENDENCIES: next, tailwindcss, @aws-sdk/client-s3, crypto, commander, axios, jsonwebtoken, @lemonsqueezy/lemonsqueezy.js, node-cron, tar, chalk

REQUIREMENTS:
- Next.js 15 with App Router (app/ directory)
- TypeScript
- Tailwind CSS v4
- shadcn/ui components (npx shadcn@latest init, then add needed components)
- Dark theme ONLY — background #0d1117, no light mode
- Lemon Squeezy checkout overlay for payments
- Landing page that converts: hero, problem, solution, pricing, FAQ
- The actual tool/feature behind a paywall (cookie-based access after purchase)
- Mobile responsive
- SEO meta tags, Open Graph tags
- /api/health endpoint that returns {"status":"ok"}
- NO HEAVY ORMs: Do NOT use Prisma, Drizzle, TypeORM, Sequelize, or Mongoose. If the tool needs persistence, use direct SQL via `pg` (Postgres) or `better-sqlite3` (local), or just filesystem JSON. Reason: these ORMs require schema files and codegen steps that fail on Vercel when misconfigured.
- INTERNAL FILE DISCIPLINE: Every internal import (paths starting with `@/`, `./`, or `../`) MUST refer to a file you actually create in this build. If you write `import { Card } from "@/components/ui/card"`, then `components/ui/card.tsx` MUST exist with a real `export const Card` (or `export default Card`). Before finishing, scan all internal imports and verify every target file exists. Do NOT use shadcn/ui patterns unless you create every component from scratch — easier path: write all UI inline in the page that uses it.
- DEPENDENCY DISCIPLINE: Every package imported in any .ts, .tsx, .js, or .jsx file MUST be
  listed in package.json dependencies (or devDependencies for build-only). Before finishing,
  scan all source files for `import` statements and verify every external package (anything
  not starting with `.` or `@/`) appears in package.json. Common shadcn/ui peers that MUST
  be added if used:
  - lucide-react, clsx, tailwind-merge, class-variance-authority
  - react-hook-form, zod, @hookform/resolvers
  - @radix-ui/* (for any shadcn component)
- After running `npm run build`, if you see "Module not found: Can't resolve 'X'", add 'X'
  to package.json dependencies and re-run npm install + npm run build until it passes.

ENVIRONMENT VARIABLES (create .env.example):
- NEXT_PUBLIC_LEMON_SQUEEZY_STORE_ID
- NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID
- LEMON_SQUEEZY_WEBHOOK_SECRET

After creating all files:
1. Run: npm install
2. Run: npm run build
3. Fix any build errors
4. Verify the build succeeds with exit code 0

Do NOT use placeholder text. Write real, helpful content for the landing page
and the tool itself. The tool should actually work and provide value.
