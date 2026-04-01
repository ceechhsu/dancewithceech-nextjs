'use client';

import { GlassyPricingSection } from "@/components/ui/animated-glassy-pricing";

const scrollToBooking = () => document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' });
const scrollToVideoEval = () => document.getElementById('video-eval')?.scrollIntoView({ behavior: 'smooth' });

const ghostButtonStyle = {
  background: "none",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: "12px",
  padding: "20px",
  cursor: "pointer",
  color: "rgba(255,255,255,0.5)",
  fontSize: "15px",
  width: "100%",
  transition: "border-color 0.2s, color 0.2s",
  outline: "none",
};

export default function PrivateLessonsPricing() {
  return (
    <>
      {/* In-Person — shown first (premium anchor) */}
      <section className="py-24 px-6" style={{ borderTop: "1px solid #1f1f1f" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-sm font-medium tracking-widest uppercase mb-4" style={{ color: "var(--accent-primary)" }}>
              Pricing
            </div>
          </div>
          <GlassyPricingSection
            title="In-Person Lessons"
            subtitle="At Get Down Dance Studios, San Jose, CA. 60-minute sessions."
            plans={[
              {
                planName: "10 Pack",
                description: "Commit to real progress.",
                price: "$2,100",
                priceSuffix: "/ 10 sessions",
                features: ["$210/session — save $400", "60 min each", "Get Down Dance Studios", "Any style or level"],
                buttonText: "Book a Consultation",
                isPopular: true,
                buttonVariant: "primary",
                onButtonClick: scrollToBooking,
              },
              {
                planName: "5 Pack",
                description: "Build momentum over time.",
                price: "$1,150",
                priceSuffix: "/ 5 sessions",
                features: ["$230/session — save $100", "60 min each", "Get Down Dance Studios", "Any style or level"],
                buttonText: "Book a Consultation",
                buttonVariant: "secondary",
                onButtonClick: scrollToBooking,
              },
              {
                planName: "Single",
                description: "Try it out at your own pace.",
                price: "$250",
                priceSuffix: "/ session",
                features: ["60 minutes", "Get Down Dance Studios", "Any style or level"],
                buttonText: "Book a Consultation",
                buttonVariant: "secondary",
                onButtonClick: scrollToBooking,
              },
            ]}
            footer={
              <div>
                <button
                  onClick={scrollToBooking}
                  className="font-semibold hover:text-white focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:rounded-xl"
                  style={ghostButtonStyle}
                >
                  Start with a free 15-min demo — book a quick consultation first →
                </button>
                <p className="text-xs mt-3 text-center" style={{ color: "rgba(255,255,255,0.3)" }}>
                  ★ Students who book a package immediately after the demo receive a special rate. Ask Ceech directly.
                </p>
              </div>
            }
          />
        </div>
      </section>

      {/* Virtual */}
      <section className="py-8 pb-24 px-6">
        <div className="max-w-5xl mx-auto">
          <GlassyPricingSection
            title="Virtual Lessons"
            subtitle="Via Zoom or Google Meet — same precision, same feedback, from anywhere."
            plans={[
              {
                planName: "Monthly Pack",
                description: "4 sessions per month. Best value.",
                price: "$280",
                priceSuffix: "/ month",
                features: ["4 × 30-min sessions", "$70/session — save $40", "Zoom or Google Meet", "Any style or level"],
                buttonText: "Book a Consultation",
                isPopular: true,
                buttonVariant: "primary",
                onButtonClick: scrollToBooking,
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
            ]}
            footer={
              <button
                onClick={scrollToVideoEval}
                className="font-semibold hover:text-white focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:rounded-xl"
                style={ghostButtonStyle}
              >
                Not sure where to start? Get a free video eval — Ceech reviews your movement personally →
              </button>
            }
          />
        </div>
      </section>
    </>
  );
}
