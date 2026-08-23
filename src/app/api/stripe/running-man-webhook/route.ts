import { NextResponse } from "next/server";

import {
  RunningManWebhookValidationError,
  finalizeRunningManStripeEvent,
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

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });

  // `text()` is intentionally called exactly once: signature verification must
  // receive the untouched raw request body.
  const rawBody = await request.text();
  let event: { id: string; type: string; livemode: boolean; data: { object: Record<string, unknown> } };
  try {
    event = getStripeClient().webhooks.constructEvent(rawBody, signature, secret) as unknown as typeof event;
  } catch {
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  try {
    const result = await finalizeRunningManStripeEvent(productionDependencies(), event);
    return NextResponse.json({ received: true, result: result.kind });
  } catch (error) {
    if (error instanceof RunningManWebhookValidationError) {
      return NextResponse.json(
        { error: "Stripe event could not be finalized." },
        { status: error.retryable ? 500 : 400 },
      );
    }
    return NextResponse.json({ error: "Stripe webhook temporarily unavailable." }, { status: 500 });
  }
}
