"use client";

import { ShieldCheck, RefreshCcw, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

const price = "$5/mo";

function buildCheckoutUrl(productId: string | undefined) {
  if (!productId) {
    return null;
  }

  return `https://checkout.lemonsqueezy.com/buy/${productId}`;
}

export function PricingCard() {
  const checkoutUrl = buildCheckoutUrl(process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID);

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Pro Backup</CardTitle>
        <CardDescription>
          For Claude Code power users with serious hook, skill, and plugin setups.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="text-4xl font-bold tracking-tight">
          {price}
          <span className="ml-1 text-base font-medium text-[var(--muted)]">flat monthly</span>
        </div>

        <ul className="space-y-3 text-sm">
          <li className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-[#89bbff]" />
            End-to-end encrypted snapshots before data leaves your machine.
          </li>
          <li className="flex items-start gap-2">
            <RefreshCcw className="mt-0.5 h-4 w-4 text-[#89bbff]" />
            Weekly automatic backup of hooks, skills, plugins, and commands.
          </li>
          <li className="flex items-start gap-2">
            <Lock className="mt-0.5 h-4 w-4 text-[#89bbff]" />
            Cookie-gated dashboard, CLI token auth, and signed webhook activation.
          </li>
        </ul>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-2">
        {checkoutUrl ? (
          <a
            href={checkoutUrl}
            className="lemonsqueezy-button"
            target="_blank"
            rel="noreferrer"
          >
            <Button className="w-full" size="lg">
              Start Secure Backups
            </Button>
          </a>
        ) : (
          <Button className="w-full" size="lg" disabled>
            Configure Lemon Squeezy Product ID
          </Button>
        )}
        <p className="text-xs text-[var(--muted)]">
          Purchase once, then unlock dashboard access with the checkout email.
        </p>
      </CardFooter>
    </Card>
  );
}
