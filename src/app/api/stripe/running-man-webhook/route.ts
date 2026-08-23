import { NextResponse } from "next/server";
import { Resend } from "resend";

import {
  RunningManWebhookValidationError,
  finalizeRunningManStripeEvent,
  notifyRunningManOwner,
  parseRunningManStripeLivemode,
  type RunningManWebhookDependencies,
  type RunningManOwnerAlert,
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

function ownerNotifier(): RunningManWebhookDependencies["notifyOwner"] {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RUNNING_MAN_NOTIFICATION_FROM;
  const to = process.env.RUNNING_MAN_OWNER_EMAIL;
  // No sender, API key, or owner address means notifications are deliberately
  // disabled. This keeps test and preview environments incapable of sending.
  if (!apiKey || !from || !to) return undefined;
  const resend = new Resend(apiKey);
  return async (alert: RunningManOwnerAlert) => {
    const subject = alert.kind === "refund_review"
      ? `Running Man refund review (${alert.partial ? "partial" : "full"})`
      : alert.kind === "minimum_enrollment_under_8"
        ? "Running Man minimum enrollment needs review"
        : "Running Man Stripe payload needs review";
    const text = alert.kind === "refund_review"
      ? `Stripe event ${alert.eventId} requires ${alert.partial ? "partial" : "full"} refund review.`
      : alert.kind === "minimum_enrollment_under_8"
        ? `Only ${alert.activePaid} paid Running Man students are confirmed; minimum is 8.`
        : `Stripe event ${alert.eventId} (${alert.eventType}) could not be verified.`;
    const { error } = await resend.emails.send({ from, to, subject, text });
    if (error) throw new Error("Running Man owner alert could not be delivered.");
  };
}

function productionDependencies(): RunningManWebhookDependencies {
  return {
    repository: createRunningManRepository(supabaseAdmin as unknown as RunningManRpcClient),
    stripe: getStripeClient(parseRunningManStripeLivemode(process.env.RUNNING_MAN_STRIPE_LIVEMODE)) as unknown as RunningManWebhookDependencies["stripe"],
    priceIds: {
      1: price(COHORT.tiers[0].priceEnv),
      2: price(COHORT.tiers[1].priceEnv),
      3: price(COHORT.tiers[2].priceEnv),
      coaching: price(COHORT.coaching.priceEnv),
    },
    expectedLivemode: parseRunningManStripeLivemode(process.env.RUNNING_MAN_STRIPE_LIVEMODE),
    notifyOwner: ownerNotifier(),
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

  let dependencies: RunningManWebhookDependencies;
  try {
    dependencies = productionDependencies();
  } catch {
    return NextResponse.json({ error: "Stripe webhook temporarily unavailable." }, { status: 500 });
  }
  try {
    const result = await finalizeRunningManStripeEvent(dependencies, event);
    return NextResponse.json({ received: true, result: result.kind });
  } catch (error) {
    if (error instanceof RunningManWebhookValidationError) {
      if (!error.identifiedRunningMan && event.type.startsWith("checkout.session.")) {
        return NextResponse.json({ received: true, result: "ignored" });
      }
      if (!error.identifiedRunningMan) {
        return NextResponse.json({ error: "Stripe event could not be finalized." }, { status: 500 });
      }
      try {
        await notifyRunningManOwner(dependencies, { kind: "invalid_stripe_payload", eventId: event.id, eventType: event.type });
      } catch {
        return NextResponse.json({ error: "Stripe webhook temporarily unavailable." }, { status: 500 });
      }
      return NextResponse.json(
        { error: "Stripe event could not be finalized." },
        { status: error.retryable ? 500 : 400 },
      );
    }
    return NextResponse.json({ error: "Stripe webhook temporarily unavailable." }, { status: 500 });
  }
}
