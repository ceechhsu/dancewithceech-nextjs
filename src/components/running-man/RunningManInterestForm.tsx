"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";

import { RUNNING_MAN_EVENTS, trackRunningManEvent } from "@/lib/analytics/client";

export default function RunningManInterestForm() {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function joinInterestList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || submitted || !email.trim() || !consent) return;

    setIsSubmitting(true);
    setNotice(null);

    try {
      const response = await fetch("/api/running-man-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: firstName.trim(),
          email: email.trim(),
          marketingConsent: consent,
          website,
        }),
      });
      const body: unknown = await response.json();

      if (response.ok && body && typeof body === "object" && "success" in body && body.success === true) {
        trackRunningManEvent(RUNNING_MAN_EVENTS.waitlistJoined, { placement: "method_page_interest" });
        setSubmitted(true);
        return;
      }

      if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
        setNotice(body.error);
      } else {
        setNotice("We couldn’t add you to the interest list. Please try again in a moment.");
      }
    } catch {
      setNotice("We couldn’t add you to the interest list. Please try again in a moment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <p role="status" aria-live="polite" className="mx-auto mt-9 max-w-2xl rounded-2xl border border-[#FDB515]/30 bg-black/20 p-6 text-center text-base leading-7 text-white/85">
        Thanks—you’re on the interest list. I’ll email you when the next class details are ready. There’s no obligation to join.
      </p>
    );
  }

  return (
    <form onSubmit={joinInterestList} className="mx-auto mt-9 max-w-2xl space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-left text-sm font-semibold text-white/85" htmlFor="running-man-interest-name">
          First name <span className="font-normal text-white/50">(optional)</span>
          <input
            id="running-man-interest-name"
            type="text"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            autoComplete="given-name"
            maxLength={120}
            className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-black/25 px-4 text-base text-white placeholder:text-white/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB515]"
          />
        </label>
        <label className="block text-left text-sm font-semibold text-white/85" htmlFor="running-man-interest-email">
          Email address
          <input
            id="running-man-interest-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
            maxLength={320}
            className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-black/25 px-4 text-base text-white placeholder:text-white/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB515]"
          />
        </label>
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-4 text-left text-sm leading-6 text-white/75">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          required
          className="mt-1 h-4 w-4 shrink-0 accent-[#FDB515]"
        />
        <span>Yes, email me about future Running Man classes. I can unsubscribe anytime.</span>
      </label>

      <label className="absolute -left-[10000px] h-px w-px overflow-hidden" aria-hidden="true">
        Website
        <input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
      </label>

      <button
        type="submit"
        disabled={isSubmitting || !email.trim() || !consent}
        className="inline-flex min-h-14 w-full items-center justify-center rounded-full bg-[#FDB515] px-7 text-center text-base font-extrabold text-black transition hover:-translate-y-0.5 hover:bg-[#FFD15C] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/50"
      >
        {isSubmitting ? <><LoaderCircle aria-hidden="true" className="mr-2 h-5 w-5 animate-spin" />Adding you…</> : "Keep me posted"}
      </button>

      <p className="text-center text-sm leading-6 text-white/55">
        This is an interest list, not enrollment. Dates, format, and price aren’t set yet, and there’s no obligation.
      </p>
      {notice ? <p role="alert" aria-live="assertive" className="text-center text-sm leading-6 text-[#FDB515]">{notice}</p> : null}
    </form>
  );
}
