"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { GlassyPricingSection } from "@/components/approved-pages/GlassyPricing";
import { onlineCoachingOffers } from "@/lib/approved-pages/coaching-offers";
import pricingStyles from "../san-jose/SanJosePricing.module.css";

function subscribeMotion(callback: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

const bookingHref = "/private-lessons#booking";

export default function OnlinePricing() {
  const reduced = useSyncExternalStore(subscribeMotion, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => true);
  return <div className={pricingStyles.pricing}>
    <section className="py-24 px-6" style={{ borderTop: "1px solid #1f1f1f" }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <div className="text-sm font-medium tracking-widest uppercase mb-4" style={{ color: "var(--accent-primary-accessible)" }}>Pricing</div>
        </div>
        <GlassyPricingSection
          showAnimatedBackground={!reduced}
          title="Online Lessons"
          subtitle="Choose the amount of coaching that fits. Start with a single cycle or plan for repeated practice. The free consultation helps you choose; it does not commit you to a purchase."
          plans={onlineCoachingOffers.map((offer, index) => ({
            planName: offer.name,
            description: offer.detail,
            price: offer.price,
            priceSuffix: index === 0 ? "/ cycle" : index === 1 ? "/ 5 cycles" : "/ 10 cycles",
            features: [offer.unit, "One video + recorded review per cycle", "30-minute Google Meet per cycle", offer.terms],
            buttonText: "Book a Free 30-Minute Phone Consultation",
            buttonVariant: index === 0 ? "primary" : "secondary",
            buttonHref: bookingHref,
            buttonCoachingOffer: "online_coaching",
          }))}
          footer={<div>
            <p className="mb-5 text-sm text-white/60">One complete cycle includes one video submission, recorded feedback within three business days, and one 30-minute Live Coaching Session on Google Meet. All options are one-time purchases. Your free consultation is a phone conversation, separate from the paid coaching session.</p>
            <Link href={bookingHref} prefetch={false} className="block w-full rounded-xl border border-white/15 p-5 text-center text-[15px] font-semibold text-white/70 hover:text-white">Book a free 30-minute phone consultation</Link>
            <div className="mt-5 text-center"><Link href="/private-lessons#video-eval" prefetch={false} className="funnel-link">Or request your one-time free video evaluation →</Link></div>
          </div>}
        />
      </div>
    </section>
  </div>;
}
