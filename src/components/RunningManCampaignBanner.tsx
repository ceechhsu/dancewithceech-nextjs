import TrackedRunningManLink from "@/components/running-man/TrackedRunningManLink";
import TrackedRunningManVideo from "@/components/running-man/TrackedRunningManVideo";

export default function RunningManCampaignBanner() {
  return (
    <section
      aria-labelledby="running-man-method-heading"
      className="px-5 py-12 sm:px-8 lg:py-16"
      style={{ backgroundColor: "#111827", borderTop: "1px solid #1d4ed8", borderBottom: "1px solid #1d4ed8" }}
    >
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_1fr] lg:gap-14">
        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-widest" style={{ color: "#FDB515" }}>
            Learn the Running Man
          </div>
          <h2 id="running-man-method-heading" className="font-display text-4xl font-extrabold uppercase leading-[0.98] tracking-tight text-white sm:text-5xl">
            The Running Man Method
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-white/75">
            Learn the Running Man one count at a time. A beginner-friendly, rhythm-first lesson to help you make the move feel natural.
          </p>
          <TrackedRunningManLink
            href="/running-man-method"
            placement="homepage_campaign_banner"
            destination="method_page"
            className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-[#2563EB] px-6 py-3 text-sm font-bold text-white shadow-[0_16px_44px_rgba(37,99,235,0.25)] transition hover:-translate-y-0.5 hover:bg-[#1D4ED8] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FDB515]"
          >
            Explore the lesson
          </TrackedRunningManLink>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/60">
            Interested in a future live class?{" "}
            <TrackedRunningManLink
              href="/running-man-method#interest"
              placement="homepage_campaign_banner"
              destination="class_interest"
              className="font-semibold text-white underline underline-offset-4 transition hover:text-[#FDB515] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FDB515]"
            >
              Get updates
            </TrackedRunningManLink>
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/15 bg-black shadow-2xl">
          <TrackedRunningManVideo
            loadOnPlay
            placement="homepage_campaign_banner"
            className="block aspect-video w-full"
            controls
            playsInline
            preload="metadata"
            poster="/images/running-man-method-teaser-poster.webp"
            aria-label="Ceech and Margarita demonstrating the Running Man with step-by-step captions"
          >
            <source src="/videos/edit/running-man-method-teaser-web.mp4" type="video/mp4" />
            Your browser does not support video playback.
          </TrackedRunningManVideo>
        </div>
      </div>
    </section>
  );
}
