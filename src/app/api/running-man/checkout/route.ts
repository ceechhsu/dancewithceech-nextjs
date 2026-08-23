import { NextResponse } from "next/server";

import {
  createRunningManCheckout,
  isRunningManCheckoutRequest,
  trustedNetworkSignal,
  type CheckoutServiceDependencies,
} from "@/lib/running-man/checkout";
import { COHORT } from "@/lib/running-man/config";
import { createRunningManRepository, type RunningManRpcClient } from "@/lib/running-man/repository";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getStripeClient } from "@/lib/stripe";
import { parseRunningManStripeLivemode } from "@/lib/running-man/webhook";

export const runtime = "nodejs";

function networkSignal(request: Request): string {
  return trustedNetworkSignal(request.headers, process.env.VERCEL === "1");
}

function productionDependencies(): CheckoutServiceDependencies {
  const price = (variable: string) => {
    const value = process.env[variable];
    if (!value) throw new Error("Stripe checkout is not configured.");
    return value;
  };
  const attemptSecret = process.env.RUNNING_MAN_ATTEMPT_COOKIE_SECRET;
  if (!attemptSecret) throw new Error("Checkout is not configured.");

  return {
    repository: createRunningManRepository(supabaseAdmin as unknown as RunningManRpcClient),
    stripe: getStripeClient(parseRunningManStripeLivemode(process.env.RUNNING_MAN_STRIPE_LIVEMODE)) as unknown as CheckoutServiceDependencies["stripe"],
    priceIds: {
      1: price(COHORT.tiers[0].priceEnv),
      2: price(COHORT.tiers[1].priceEnv),
      3: price(COHORT.tiers[2].priceEnv),
      coaching: price(COHORT.coaching.priceEnv),
    },
    attemptSecret,
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 });
  }
  if (!isRunningManCheckoutRequest(body)) {
    return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 });
  }

  try {
    const result = await createRunningManCheckout(productionDependencies(), {
      request: body,
      attemptCookie: request.headers.get("cookie") ?? undefined,
      networkSignal: networkSignal(request),
    });
    const response = result.kind === "checkout"
      ? NextResponse.json({ checkoutUrl: result.checkoutUrl })
      : result.kind === "confirmation"
        ? NextResponse.json({ confirmationUrl: result.confirmationUrl, terminal: true })
      : result.kind === "reconfirm"
        ? NextResponse.json({ enrollmentState: result.enrollmentState, reconfirmationRequired: true }, { status: 409 })
        : NextResponse.json({ error: result.message, code: result.code }, { status: result.code === "closed" ? 410 : 400 });
    if (result.setAttemptCookie) response.headers.set("set-cookie", result.setAttemptCookie);
    return response;
  } catch {
    return NextResponse.json({ error: "Checkout is temporarily unavailable." }, { status: 503 });
  }
}
