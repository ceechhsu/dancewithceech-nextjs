import { NextResponse } from "next/server";
import { Resend } from "resend";

import {
  hasRunningManCronAuthorization,
  parseRunningManStripeLivemode,
  assertRunningManOwnerAlertConfiguration,
  reconcileRunningManStripeSessions,
  type RunningManWebhookDependencies,
  type RunningManOwnerAlert,
} from "@/lib/running-man/webhook";
import { COHORT } from "@/lib/running-man/config";
import { createRunningManRepository, type RunningManRpcClient } from "@/lib/running-man/repository";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";
export const maxDuration = 60;

function price(variable: string): string {
  const value = process.env[variable];
  if (!value) throw new Error("Running Man Stripe prices are not configured.");
  return value;
}

function ownerNotifier(livemode: boolean): RunningManWebhookDependencies["notifyOwner"] {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RUNNING_MAN_NOTIFICATION_FROM;
  const to = process.env.RUNNING_MAN_OWNER_EMAIL;
  assertRunningManOwnerAlertConfiguration(livemode, { apiKey, from, to });
  if (!apiKey || !from || !to) return undefined;
  const resend = new Resend(apiKey);
  return async (alert: RunningManOwnerAlert) => {
    if (alert.kind !== "minimum_enrollment_under_8") return;
    const { error } = await resend.emails.send({
      from,
      to,
      subject: "Running Man minimum enrollment needs review",
      text: `Only ${alert.activePaid} paid Running Man students are confirmed; minimum is 8.`,
    });
    if (error) throw new Error("Running Man owner alert could not be delivered.");
  };
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
  const livemode = parseRunningManStripeLivemode(process.env.RUNNING_MAN_STRIPE_LIVEMODE);
  return {
    repository: createRunningManRepository(supabaseAdmin as unknown as RunningManRpcClient),
    stripe: getStripeClient(livemode) as unknown as RunningManWebhookDependencies["stripe"],
    priceIds: {
      1: price(COHORT.tiers[0].priceEnv),
      2: price(COHORT.tiers[1].priceEnv),
      3: price(COHORT.tiers[2].priceEnv),
      coaching: price(COHORT.coaching.priceEnv),
    },
    expectedLivemode: livemode,
    notifyOwner: ownerNotifier(livemode),
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
