import Link from "next/link";

import HeroSeatStatus from "@/components/running-man/HeroSeatStatus";

export default function RunningManCampaignBanner() {
  return (
    <section
      aria-labelledby="running-man-campaign-heading"
      className="px-6 py-10"
      style={{ backgroundColor: "#111827", borderTop: "1px solid #1d4ed8", borderBottom: "1px solid #1d4ed8" }}
    >
      <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-7 md:flex-row md:items-center">
        <div className="max-w-2xl">
          <div className="mb-2 text-xs font-bold uppercase tracking-widest" style={{ color: "#FDB515" }}>
            New · Founding Cohort
          </div>
          <h2 id="running-man-campaign-heading" className="text-2xl font-bold text-white md:text-3xl">
            The Running Man Method
          </h2>
          <p className="mt-2 text-base leading-relaxed text-white/75">
            A four-week live cohort for complete beginners who want one move they can trust on the dance floor.
          </p>
          <p className="mt-3 text-sm text-white/60">
            September 24–October 22, 2026 · Thursdays at 8 p.m. Pacific · Limited to 12 students
          </p>
          <div className="mt-2" aria-label="Current Running Man cohort availability">
            <HeroSeatStatus compact showPrice />
          </div>
        </div>

        <Link
          href="/running-man-method#enroll"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#2563EB" }}
        >
          View the Founding Cohort
        </Link>
      </div>
    </section>
  );
}
