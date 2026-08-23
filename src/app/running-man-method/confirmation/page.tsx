import type { Metadata } from "next";
import Link from "next/link";

import { COHORT } from "@/lib/running-man/config";
import {
  verifyRunningManConfirmationSession,
  type RunningManConfirmationResult,
  type ConfirmationStripeClient,
} from "@/lib/running-man/confirmation";
import { parseRunningManStripeLivemode } from "@/lib/running-man/webhook";
import { getStripeClient } from "@/lib/stripe";
import type { TierIndex } from "@/lib/running-man/types";

export const metadata: Metadata = {
  title: "Running Man Method Enrollment | Dance With Ceech",
  description: "Your Running Man Method checkout status.",
};

type ConfirmationPageProps = {
  searchParams: Promise<{ session_id?: string | string[] }>;
};

function price(variable: string): string {
  const value = process.env[variable];
  if (!value) throw new Error("Running Man Stripe prices are not configured.");
  return value;
}

async function verifySession(sessionId: string | undefined): Promise<RunningManConfirmationResult> {
  if (!sessionId) return { kind: "invalid" };
  try {
    const expectedLivemode = parseRunningManStripeLivemode(process.env.RUNNING_MAN_STRIPE_LIVEMODE);
    const stripe = getStripeClient(expectedLivemode) as unknown as ConfirmationStripeClient;
    return await verifyRunningManConfirmationSession(
      stripe,
      sessionId,
      {
        1: price(COHORT.tiers[0].priceEnv),
        2: price(COHORT.tiers[1].priceEnv),
        3: price(COHORT.tiers[2].priceEnv),
        coaching: price(COHORT.coaching.priceEnv),
      },
      expectedLivemode,
    );
  } catch {
    return { kind: "invalid" };
  }
}

function tierLabel(tierIndex: TierIndex): string {
  return `$${COHORT.tiers[tierIndex - 1].priceCents / 100} founding-cohort enrollment`;
}

export default async function RunningManConfirmationPage({ searchParams }: ConfirmationPageProps) {
  const params = await searchParams;
  const sessionParam = params.session_id;
  const sessionId = Array.isArray(sessionParam) ? sessionParam[0] : sessionParam;
  const result = await verifySession(sessionId);

  return (
    <main className="min-h-screen bg-[#080808] px-5 py-20 text-white sm:px-8 lg:py-28">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-white/10 bg-[#111] p-8 shadow-2xl sm:p-12">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FDB515]">The Running Man Method</p>
        {result.kind === "success" ? (
          <>
            <h1 className="mt-5 font-display text-5xl font-extrabold uppercase leading-none sm:text-6xl">Payment received.</h1>
            <p className="mt-6 text-lg leading-8 text-white/75">Your checkout was verified. Your enrollment is being finalized securely, and you will receive the cohort details and next steps by email.</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5"><p className="text-xs font-bold uppercase tracking-[0.14em] text-white/50">Enrollment</p><p className="mt-2 font-semibold">{tierLabel(result.tierIndex)}</p></div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5"><p className="text-xs font-bold uppercase tracking-[0.14em] text-white/50">Private coaching</p><p className="mt-2 font-semibold">{result.includeCoaching ? "$100 included" : "Not included"}</p></div>
            </div>
            <div className="mt-4 rounded-2xl border border-[#FDB515]/30 bg-[#15120A] p-5"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#FDB515]">Total paid</p><p className="mt-2 font-display text-3xl font-bold uppercase">${result.totalAmountCents / 100} paid in full</p></div>
            <p className="mt-7 text-sm leading-6 text-white/55">Keep this page for your records. If you do not receive your next steps, contact Ceech at dancewithceech@gmail.com.</p>
            <Link href="/" className="mt-9 inline-flex min-h-12 items-center justify-center rounded-full bg-[#2563EB] px-6 text-sm font-bold text-white transition hover:bg-[#1D4ED8] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FDB515]">Dance With Ceech Homepage</Link>
          </>
        ) : result.kind === "pending" ? (
          <>
            <h1 className="mt-5 font-display text-5xl font-extrabold uppercase leading-none sm:text-6xl">Payment processing.</h1>
            <p className="mt-6 text-lg leading-8 text-white/75">Stripe has not yet marked this checkout as paid. Please wait a moment and check your email for confirmation. Your seat remains subject to the checkout hold and is not confirmed until payment completes.</p>
          </>
        ) : (
          <>
            <h1 className="mt-5 font-display text-5xl font-extrabold uppercase leading-none sm:text-6xl">We couldn’t verify this checkout.</h1>
            <p className="mt-6 text-lg leading-8 text-white/75">This confirmation link is missing, expired, or does not match a Running Man Method checkout. No enrollment status was changed.</p>
            <p className="mt-5 text-sm leading-6 text-white/55">If you completed payment, contact Ceech at dancewithceech@gmail.com with the email address used at checkout.</p>
          </>
        )}
        {result.kind === "success" ? null : <a href="/running-man-method#enroll" className="mt-9 inline-flex min-h-12 items-center justify-center rounded-full bg-[#2563EB] px-6 text-sm font-bold text-white transition hover:bg-[#1D4ED8] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FDB515]">Return to the Running Man Method</a>}
      </div>
    </main>
  );
}
