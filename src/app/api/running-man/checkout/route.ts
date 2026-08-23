import { NextResponse } from "next/server";

import {
  createRunningManCheckout,
  type CheckoutServiceDependencies,
  type RunningManCheckoutRequest,
} from "@/lib/running-man/checkout";
import { COHORT } from "@/lib/running-man/config";
import { createRunningManRepository, type RunningManRpcClient } from "@/lib/running-man/repository";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

function networkSignal(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown-network";
  return `${forwarded}|${request.headers.get("user-agent") ?? "unknown-agent"}`;
}

function isCheckoutRequest(value: unknown): value is RunningManCheckoutRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const body = value as Record<string, unknown>;
  return (body.expectedTier === 1 || body.expectedTier === 2 || body.expectedTier === 3)
    && typeof body.includeCoaching === "boolean"
    && typeof body.termsVersion === "string"
    && body.acknowledged === true;
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
    stripe: getStripeClient() as unknown as CheckoutServiceDependencies["stripe"],
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
  if (!isCheckoutRequest(body)) {
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
      : result.kind === "reconfirm"
        ? NextResponse.json({ enrollmentState: result.enrollmentState, reconfirmationRequired: true }, { status: 409 })
        : NextResponse.json({ error: result.message, code: result.code }, { status: result.code === "closed" ? 410 : 400 });
    if (result.setAttemptCookie) response.headers.set("set-cookie", result.setAttemptCookie);
    return response;
  } catch {
    return NextResponse.json({ error: "Checkout is temporarily unavailable." }, { status: 503 });
  }
}
