import { NextResponse } from "next/server";

import {
  hasRunningManCronAuthorization,
  reconcileRunningManStripeSessions,
  type RunningManWebhookDependencies,
} from "@/lib/running-man/webhook";
import { COHORT } from "@/lib/running-man/config";
import { createRunningManRepository, type RunningManRpcClient } from "@/lib/running-man/repository";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

function price(variable: string): string {
  const value = process.env[variable];
  if (!value) throw new Error("Running Man Stripe prices are not configured.");
  return value;
}

function configuredLivemode(): boolean | undefined {
  const value = process.env.RUNNING_MAN_STRIPE_LIVEMODE;
  if (value === undefined || value === "") return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error("RUNNING_MAN_STRIPE_LIVEMODE must be true or false.");
}

function cronSecret(): string | undefined {
  const runningManSecret = process.env.RUNNING_MAN_CRON_SECRET;
  const vercelSecret = process.env.CRON_SECRET;
  if (!runningManSecret) return undefined;
  // Vercel Cron sends CRON_SECRET automatically. Requiring equality keeps the
  // explicit Running Man secret as the authorization boundary without silently
  // accepting a different broad cron secret.
  if (vercelSecret && vercelSecret !== runningManSecret) {
    throw new Error("Running Man cron secret configuration does not match Vercel Cron.");
  }
  return runningManSecret;
}

function productionDependencies(): RunningManWebhookDependencies {
  return {
    repository: createRunningManRepository(supabaseAdmin as unknown as RunningManRpcClient),
    stripe: getStripeClient() as unknown as RunningManWebhookDependencies["stripe"],
    priceIds: {
      1: price(COHORT.tiers[0].priceEnv),
      2: price(COHORT.tiers[1].priceEnv),
      3: price(COHORT.tiers[2].priceEnv),
      coaching: price(COHORT.coaching.priceEnv),
    },
    expectedLivemode: configuredLivemode(),
  };
}

export async function GET(request: Request) {
  let secret: string | undefined;
  try {
    secret = cronSecret();
  } catch {
    return NextResponse.json({ error: "Reconciliation is temporarily unavailable." }, { status: 503 });
  }
  if (!hasRunningManCronAuthorization(request.headers, secret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const result = await reconcileRunningManStripeSessions(productionDependencies());
    return NextResponse.json({ ok: true, ...result });
  } catch {
    // A failed or incomplete Stripe scan must stay retryable and cannot free holds.
    return NextResponse.json({ error: "Reconciliation is temporarily unavailable." }, { status: 503 });
  }
}
