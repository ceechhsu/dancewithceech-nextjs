'use client';

import { GlassyPricingSection } from "@/components/ui/animated-glassy-pricing";

const scrollToBooking = () => document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' });
const scrollToVideoEval = () => document.getElementById('video-eval')?.scrollIntoView({ behavior: 'smooth' });

export default function PrivateLessonsPricing() {
  return (
    <>
      {/* Virtual */}
      <section className="py-24 px-6" style={{ borderTop: "1px solid #1f1f1f" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-4">
            <div className="text-sm font-medium tracking-widest uppercase mb-4" style={{ color: "var(--accent-primary)" }}>
              Pricing
            </div>
          </div>
          <GlassyPricingSection
            title="Virtual Lessons"
            subtitle="Via Zoom or Google Meet — same precision, same feedback, from anywhere."
            plans={[
              {
                planName: "Free Video Eval",
                description: "Submit a 30-sec video. Get a personal breakdown.",
                price: "$0",
                priceSuffix: "",
                features: ["Upload to YouTube (unlisted)", "Ceech reviews & analyzes", "Same-day eval discount available", "One per person"],
                buttonText: "Submit Your Video",
                buttonVariant: "secondary",
                onButtonClick: scrollToVideoEval,
              },
              {
                planName: "Single Session",
                description: "Try it out at your own pace.",
                price: "$80",
                priceSuffix: "/ 30 min",
                features: ["Zoom or Google Meet", "Any style or level", "Real-time corrections"],
                buttonText: "Book a Consultation",
                buttonVariant: "secondary",
                onButtonClick: scrollToBooking,
              },
              {
                planName: "Monthly Pack",
                description: "4 sessions per month. Best value.",
                price: "$280",
                priceSuffix: "/ month",
                features: ["4 × 30-min sessions", "Save $40 vs single rate", "Zoom or Google Meet", "Any style or level"],
                buttonText: "Book a Consultation",
                isPopular: true,
                buttonVariant: "primary",
                onButtonClick: scrollToBooking,
              },
            ]}
          />
        </div>
      </section>

      {/* In-Person */}
      <section className="py-8 pb-24 px-6">
        <div className="max-w-5xl mx-auto">
          <GlassyPricingSection
            title="In-Person Lessons"
            subtitle="At Get Down Dance Studio, San Jose, CA. 60-minute sessions."
            plans={[
              {
                planName: "Free Demo",
                description: "15 minutes. No obligation.",
                price: "$0",
                priceSuffix: "",
                features: ["15-minute class", "Get Down Dance Studio", "No commitment required"],
                buttonText: "Book a Consultation",
                buttonVariant: "secondary",
                onButtonClick: scrollToBooking,
              },
              {
                planName: "Single",
                description: "One full 60-minute lesson.",
                price: "$250",
                priceSuffix: "/ session",
                features: ["60 minutes", "Get Down Dance Studio", "Any style or level"],
                buttonText: "Book a Consultation",
                buttonVariant: "secondary",
                onButtonClick: scrollToBooking,
              },
              {
                planName: "5 Pack",
                description: "Commit to the process.",
                price: "$1,150",
                priceSuffix: "/ 5 sessions",
                features: ["$230/lesson", "60 min each", "Get Down Dance Studio"],
                buttonText: "Book a Consultation",
                buttonVariant: "secondary",
                onButtonClick: scrollToBooking,
              },
              {
                planName: "10 Pack",
                description: "Serious progress, serious savings.",
                price: "$2,100",
                priceSuffix: "/ 10 sessions",
                features: ["$210/lesson", "60 min each", "Get Down Dance Studio", "Same-day demo discount available"],
                buttonText: "Book a Consultation",
                isPopular: true,
                buttonVariant: "primary",
                onButtonClick: scrollToBooking,
              },
            ]}
          />
          <p className="text-xs mt-6 text-center" style={{ color: "var(--muted)" }}>
            ★ Students who sign up for a package immediately after the free demo receive a special rate. Ask Ceech directly.
          </p>
        </div>
      </section>
    </>
  );
}
