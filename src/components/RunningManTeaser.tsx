import Link from "next/link";

type Props = {
  eyebrow?: string;
  title?: string;
  copy?: string;
};

export default function RunningManTeaser({
  eyebrow = "See the move",
  title = "This is the Running Man",
  copy = "In the four-week program, Ceech teaches the rhythm, balance, and coordination behind this move—with personal feedback so you can dance it with confidence.",
}: Props) {
  return (
    <section aria-labelledby="running-man-teaser-heading" className="border-y border-white/10 bg-[#0D0D0D] px-5 py-16 sm:px-8 lg:py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:gap-14">
        <div className="order-2 lg:order-1">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FDB515]">{eyebrow}</p>
          <h2 id="running-man-teaser-heading" className="mt-4 font-display text-4xl font-extrabold uppercase leading-[0.98] tracking-tight text-white sm:text-5xl">
            {title}
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-white/65">{copy}</p>
          <Link
            href="/running-man-method#enroll"
            className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-[#2563EB] px-6 text-sm font-bold text-white shadow-[0_16px_44px_rgba(37,99,235,0.25)] transition hover:-translate-y-0.5 hover:bg-[#1D4ED8] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FDB515]"
          >
            View the Founding Cohort
          </Link>
        </div>

        <div className="order-1 overflow-hidden rounded-3xl border border-white/15 bg-black shadow-2xl lg:order-2">
          <video
            className="block aspect-video w-full"
            controls
            playsInline
            preload="metadata"
            poster="/images/running-man-method-teaser-poster.jpg"
            aria-label="Ceech and Margarita demonstrating the Running Man with step-by-step captions"
          >
            <source src="/videos/running-man-method-teaser.mp4" type="video/mp4" />
            Your browser does not support video playback.
          </video>
        </div>
      </div>
    </section>
  );
}
