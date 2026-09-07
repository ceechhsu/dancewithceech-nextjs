'use client';

import { GlassyPricingSection } from "@/components/ui/animated-glassy-pricing";

const scrollToBooking = () => document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' });

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
      {/* In-person lessons are shown first. */}
      <section className="py-24 px-6" style={{ borderTop: "1px solid #1f1f1f" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-sm font-medium tracking-widest uppercase mb-4" style={{ color: "var(--accent-primary)" }}>
              Pricing
            </div>
          </div>
          <GlassyPricingSection
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

      {/* Virtual */}
      <section className="py-8 pb-24 px-6">
        <div className="max-w-5xl mx-auto">
          <GlassyPricingSection
            title="Virtual Lessons"
            subtitle="One complete cycle includes one video submission, private recorded feedback within three business days, and one 30-minute Live Coaching Session on Google Meet. All options are one-time purchases with no automatic renewal."
            plans={[
              {
                planName: "10-Cycle Pack",
                description: "The best per-cycle value.",
                price: "$500",
                priceSuffix: "/ 10 cycles",
                features: ["10 complete coaching cycles", "$50/cycle, save $300", "Use within 6 months of purchase", "Any style or level"],
                buttonText: "Book a Free 30-Minute Phone Consultation",
                buttonVariant: "primary",
                onButtonClick: scrollToBooking,
              },
              {
                planName: "5-Cycle Pack",
                description: "A balanced plan for steady progress.",
                price: "$300",
                priceSuffix: "/ 5 cycles",
                features: ["5 complete coaching cycles", "$60/cycle, save $100", "Use within 3 months of purchase", "Any style or level"],
                buttonText: "Book a Free 30-Minute Phone Consultation",
                buttonVariant: "secondary",
                onButtonClick: scrollToBooking,
              },
              {
                planName: "Single Cycle",
                description: "The lowest-commitment starting point.",
                price: "$80",
                priceSuffix: "/ cycle",
                features: ["1 complete coaching cycle", "Private recorded feedback", "30-minute Google Meet", "Any style or level"],
                buttonText: "Book a Free 30-Minute Phone Consultation",
                buttonVariant: "secondary",
                onButtonClick: scrollToBooking,
              },
            ]}
            footer={
              <a
                href="/private-lessons#video-eval"
                aria-label="Free video evaluation for prospective virtual students"
                className="font-semibold hover:text-white focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:rounded-xl"
                style={{ ...ghostButtonStyle, display: "block", textAlign: "center" }}
              >
                Free video evaluation for prospective virtual students. Ceech reviews your movement personally →
              </a>
            }
          />
        </div>
      </section>
    </>
  );
}
