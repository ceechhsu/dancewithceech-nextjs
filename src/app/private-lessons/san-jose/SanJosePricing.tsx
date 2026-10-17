'use client';

import { useSyncExternalStore } from "react";
import styles from "./SanJosePricing.module.css";
import { GlassyPricingSection } from "@/components/approved-pages/GlassyPricing";

import { trackConsultation } from "@/lib/analytics/consultation";

const scrollToBooking = () => { trackConsultation("consultation_link_clicked", "pricing"); document.getElementById('booking')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); };

const ghostButtonStyle = {
  background: "none",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: "12px",
  padding: "20px",
  cursor: "pointer",
  color: "rgba(255,255,255,0.7)",
  fontSize: "15px",
  width: "100%",
  transition: "border-color 0.2s, color 0.2s",
  outline: "none",
};

function subscribeMotion(callback: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

export default function SanJosePricing() {
  const reduced = useSyncExternalStore(subscribeMotion, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => true);
  return (
    <div className={styles.pricing}>
      {/* In-person lessons are shown first. */}
      <section className="py-24 px-6" style={{ borderTop: "1px solid #1f1f1f" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-sm font-medium tracking-widest uppercase mb-4" style={{ color: "var(--accent-primary-accessible)" }}>
              Pricing
            </div>
          </div>
          <GlassyPricingSection
            showAnimatedBackground={!reduced}
            title="In-Person Lessons"
            subtitle="At Get Down Dance Studios, San Jose, CA. 60-minute sessions. Studio fee included."
            plans={[
              {
                planName: "10 Pack",
                description: "Practice regularly with a 10-session package.",
                price: "$2,100",
                priceSuffix: "/ 10 sessions",
                features: ["$210/session, save $400", "60 min each", "Get Down Dance Studios", "Any style or level"],
                buttonText: "Book a Free 30-Minute Phone Consultation",
                isPopular: true,
                buttonVariant: "primary",
                onButtonClick: scrollToBooking,
              },
              {
                planName: "5 Pack",
                description: "Build momentum over time.",
                price: "$1,150",
                priceSuffix: "/ 5 sessions",
                features: ["$230/session, save $100", "60 min each", "Get Down Dance Studios", "Any style or level"],
                buttonText: "Book a Free 30-Minute Phone Consultation",
                buttonVariant: "secondary",
                onButtonClick: scrollToBooking,
              },
              {
                planName: "Single",
                description: "Try it out at your own pace.",
                price: "$250",
                priceSuffix: "/ session",
                features: ["60 minutes", "Get Down Dance Studios", "Any style or level"],
                buttonText: "Book a Free 30-Minute Phone Consultation",
                buttonVariant: "secondary",
                onButtonClick: scrollToBooking,
              },
            ]}
            footer={
              <div>
                <p className="mb-5 text-sm text-white/60">Packages are valid for one year from your first lesson. Your practice recording is included; music editing, travel, and extra participants are quoted separately.</p>
                <button
                  onClick={scrollToBooking}
                  className="font-semibold hover:text-white focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:rounded-xl"
                  style={ghostButtonStyle}
                >
                  Start with a free 30-minute phone consultation to discuss your goals and choose the right lesson option →
                </button>
              </div>
            }
          />
        </div>
      </section>

    </div>
  );
}
