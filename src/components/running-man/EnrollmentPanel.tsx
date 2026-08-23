"use client";

import { Check, CircleAlert, LoaderCircle, LockKeyhole, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { CURRENT_TERMS_VERSION, REQUIRED_COMMITMENTS } from "@/lib/running-man/terms";
import type { EnrollmentState, EnrollmentStateResponse, EnrollmentTier } from "@/lib/running-man/types";

const TIER_COPY = {
  1: { label: "First 3 Students", price: 197, saving: "Save $100 as one of the first three founding students." },
  2: { label: "Next 3 Students", price: 247, saving: "Save $50 by joining before the first six seats are filled." },
  3: { label: "Remaining 6 Students", price: 297, saving: "Standard enrollment price for the remaining available seats." },
} as const;

function tierNote(tier: EnrollmentTier, state: EnrollmentState | null): string {
  if (!state) return "Availability is being confirmed.";
  if (tier.status === "active") return "Current enrollment price";
  if (tier.status === "complete") return "This price tier is filled.";
  if (tier.status === "held") return "This price tier is currently held.";
  if (tier.status === "under_review") return "Availability is under review.";
  if (tier.status === "unavailable") return "Currently unavailable.";
  return "Available after earlier founding seats are claimed.";
}

function isEnrollmentResponse(value: unknown): value is EnrollmentStateResponse {
  return Boolean(value && typeof value === "object" && "kind" in value);
}

export default function EnrollmentPanel() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const lastStateRef = useRef<EnrollmentState | null>(null);
  const [state, setState] = useState<EnrollmentState | null>(null);
  const [unavailableMessage, setUnavailableMessage] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [coachingSelected, setCoachingSelected] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const refreshState = useCallback(async () => {
    try {
      const result = await fetch("/api/running-man/enrollment-state", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const body: unknown = await result.json();
      if (!isEnrollmentResponse(body)) throw new Error("Invalid availability response.");

      if (body.kind === "unavailable") {
        setState(null);
        setUnavailableMessage(body.message);
        return;
      }

      const previous = lastStateRef.current;
      const priceChanged = previous && previous.activeTier.index !== body.state.activeTier.index;
      const coachingChanged = previous && coachingSelected && previous.coachingStatus !== body.state.coachingStatus;
      if (priceChanged || coachingChanged || body.state.requiresPriceReconfirmation) {
        setNotice("Availability changed while you were reviewing the offer. Please review the current price and coaching option before continuing.");
      }
      if (body.state.coachingStatus !== "available") setCoachingSelected(false);
      lastStateRef.current = body.state;
      setState(body.state);
      setUnavailableMessage(null);
    } catch {
      setState(null);
      setUnavailableMessage("Enrollment availability is being checked. Please refresh in a moment.");
    }
  }, [coachingSelected]);

  useEffect(() => {
    const element = sectionRef.current;
    if (!element) return undefined;
    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), { rootMargin: "160px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return undefined;
    void refreshState();
    const interval = window.setInterval(() => void refreshState(), 15_000);
    return () => window.clearInterval(interval);
  }, [isVisible, refreshState]);

  const coachingAvailable = state?.coachingStatus === "available";
  const selectedCoaching = coachingAvailable && coachingSelected;
  const total = state ? state.activeTier.priceCents / 100 + (selectedCoaching ? 100 : 0) : null;
  const canCheckout = Boolean(state?.canStartCheckout && acknowledged && !isSubmitting);

  async function beginCheckout() {
    if (!state || !canCheckout) return;
    setIsSubmitting(true);
    setNotice(null);

    try {
      const response = await fetch("/api/running-man/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          expectedTier: state.activeTier.index,
          includeCoaching: selectedCoaching,
          termsVersion: CURRENT_TERMS_VERSION,
          acknowledged: true,
        }),
      });
      const body: unknown = await response.json();
      if (response.ok && body && typeof body === "object" && "checkoutUrl" in body && typeof body.checkoutUrl === "string") {
        window.location.assign(body.checkoutUrl);
        return;
      }

      if (response.status === 409) {
        setNotice("Availability changed before checkout could open. Review the current option, then try again.");
        await refreshState();
      } else if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
        setNotice(body.error);
      } else {
        setNotice("Checkout could not be opened. Please try again in a moment.");
      }
    } catch {
      setNotice("Checkout could not be opened. Please try again in a moment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const coachingCopy = !state
    ? "Coaching availability will be confirmed when live enrollment availability is available."
    : state.coachingStatus === "available"
      ? `${state.coachingSeatsRemaining} of ${state.coachingSeatsTotal} private-coaching spots available.`
      : state.coachingStatus === "held"
        ? "Private-coaching spots are currently held. Please keep your selection flexible."
        : state.coachingStatus === "under_review"
          ? "Private-coaching availability is under review."
          : "Private coaching is sold out for this cohort.";

  return (
    <div ref={sectionRef} className="mt-14">
      <noscript>
        <p className="rounded-2xl border border-[#FDB515]/30 bg-[#15120A] p-5 text-sm leading-6 text-white/80">
          JavaScript is required to check current availability before enrollment. Please enable it and refresh this page.
        </p>
      </noscript>

      <div className="grid gap-5 lg:grid-cols-3">
        {[1, 2, 3].map((index) => {
          const tier: EnrollmentTier = state?.tierLadder[index - 1] ?? {
            index: index as 1 | 2 | 3,
            ceiling: index === 1 ? 3 : index === 2 ? 6 : 12,
            priceCents: TIER_COPY[index as 1 | 2 | 3].price * 100,
            status: "upcoming" as const,
          };
          const copy = TIER_COPY[index as 1 | 2 | 3];
          const active = state?.activeTier.index === index && state.enrollmentStatus === "open";
          return (
            <article key={index} className={`relative rounded-3xl border p-7 ${active ? "border-2 border-[#FDB515] bg-[#15120A] shadow-[0_20px_70px_rgba(253,181,21,0.08)]" : "border-white/12 bg-[#111]"}`}>
              {index === 1 ? <span className="absolute -top-3 left-7 rounded-full bg-[#FDB515] px-3 py-1 text-xs font-extrabold uppercase tracking-[0.12em] text-black">Best founding price</span> : null}
              <p className={`mt-2 text-xs font-bold uppercase tracking-[0.18em] ${index === 1 ? "text-[#FDB515]" : index === 2 ? "text-[#60A5FA]" : "text-white/65"}`}>{copy.label} — ${copy.price}</p>
              <p className="mt-5 font-display text-6xl font-extrabold text-white">${copy.price}</p>
              <p className="mt-3 min-h-12 text-sm leading-6 text-white/65">{copy.saving}</p>
              <p className={`mt-6 border-t pt-4 text-sm font-semibold ${active ? "border-[#FDB515]/25 text-[#FDB515]" : "border-white/10 text-white/55"}`}>{tierNote(tier, state)}</p>
            </article>
          );
        })}
      </div>

      <div className="mt-6 rounded-3xl border border-[#2563EB]/45 bg-[#0B1734] p-7 sm:p-9">
        <div className="flex gap-4">
          <Sparkles aria-hidden="true" className="mt-1 h-6 w-6 shrink-0 text-[#60A5FA]" />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#60A5FA]">Limited to three students</p>
            <h3 className="mt-3 font-display text-3xl font-bold uppercase text-white">Add Private Coaching for $100</h3>
            <p className="mt-3 text-sm leading-6 text-white/70">Two 20-minute private check-ins with Ceech—one in Week 1 and one in Week 3—focused on your specific challenges.</p>
          </div>
        </div>
        <label className={`mt-7 flex cursor-pointer gap-4 rounded-2xl border p-5 transition ${coachingAvailable ? "border-[#60A5FA]/45 bg-[#2563EB]/10 hover:bg-[#2563EB]/15" : "cursor-not-allowed border-white/10 bg-black/20"}`}>
          <input
            type="checkbox"
            checked={selectedCoaching}
            disabled={!coachingAvailable || isSubmitting}
            onChange={(event) => setCoachingSelected(event.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 accent-[#2563EB]"
          />
          <span>
            <span className="block font-semibold text-white">Add private coaching to my enrollment</span>
            <span className="mt-1 block text-sm leading-6 text-white/65">{coachingCopy}</span>
          </span>
        </label>
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
        <div className="flex gap-4">
          <LockKeyhole aria-hidden="true" className="mt-1 h-6 w-6 shrink-0 text-[#FDB515]" />
          <div>
            <h3 className="font-display text-2xl font-bold uppercase text-white">Confirm Your Commitment</h3>
            <p className="mt-2 text-sm leading-6 text-white/65">This is active training, not a watch-only course. Please confirm before opening secure checkout.</p>
          </div>
        </div>
        <label className="mt-6 flex cursor-pointer gap-4 rounded-2xl border border-white/10 bg-black/20 p-5 transition hover:border-white/25">
          <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[#FDB515]" />
          <span className="text-sm font-semibold leading-6 text-white/90">I have read and agree to the program commitments, participation requirements, and refund, cancellation, and postponement terms.</span>
        </label>
        <details className="mt-5 rounded-xl bg-black/20 px-5 py-4 text-sm leading-6 text-white/65">
          <summary className="cursor-pointer font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FDB515]">Review what you are confirming</summary>
          <ul className="mt-4 space-y-2">
            {REQUIRED_COMMITMENTS.map((commitment) => <li key={commitment.id} className="flex gap-2"><Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#FDB515]" />{commitment.label}</li>)}
          </ul>
        </details>
      </div>

      <div className="mt-6 rounded-3xl border border-[#FDB515]/30 bg-[#15120A] p-6 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#FDB515]">Your current enrollment</p>
          <p className="mt-2 font-display text-3xl font-bold uppercase text-white">{total ? `$${total} paid in full` : "Availability required before checkout"}</p>
          <p aria-live="polite" className="mt-2 max-w-2xl text-sm leading-6 text-white/70">{state?.currentCta.supportingCopy ?? unavailableMessage ?? "Checking live enrollment availability…"}</p>
        </div>
        <button type="button" onClick={beginCheckout} disabled={!canCheckout} className="mt-5 inline-flex min-h-14 w-full items-center justify-center rounded-full bg-[#2563EB] px-7 text-center text-base font-bold text-white shadow-[0_16px_44px_rgba(37,99,235,0.28)] transition hover:-translate-y-0.5 hover:bg-[#1D4ED8] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FDB515] disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/50 disabled:shadow-none sm:mt-0 sm:w-auto">
          {isSubmitting ? <><LoaderCircle aria-hidden="true" className="mr-2 h-5 w-5 animate-spin" />Opening secure checkout…</> : state?.currentCta.label ?? "Checking availability…"}
        </button>
      </div>

      {notice ? <div role="status" aria-live="polite" className="mt-5 flex gap-3 rounded-2xl border border-[#FDB515]/35 bg-[#15120A] p-5 text-sm leading-6 text-white/85"><CircleAlert aria-hidden="true" className="h-5 w-5 shrink-0 text-[#FDB515]" />{notice}</div> : null}
      <p className="mt-7 rounded-2xl border border-white/10 bg-white/[0.025] p-6 text-center text-sm leading-6 text-white/65">Enrollment closes September 17, 2026, at 11:59 p.m. Pacific Time—or immediately when all 12 seats are filled. The cohort requires at least eight students. If Ceech cancels or postpones it, you may choose a full refund or transfer after the next cohort dates are confirmed.</p>
    </div>
  );
}
