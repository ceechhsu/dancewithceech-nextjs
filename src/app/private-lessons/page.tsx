import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Image from "next/image";
import Link from "next/link";
import TestimonialsCarousel from "@/components/TestimonialsCarousel";
import PrivateLessonsPricing from "@/components/PrivateLessonsPricing";
import VideoEvalForm from "@/components/VideoEvalForm";

export const metadata = {
  title: "Private Lessons — DanceWithCeech",
  description: "Book a private 1-on-1 dance lesson with Ceech — in-person at Get Down Dance Studio in San Jose, or virtually via Zoom. Personalized hip-hop instruction for all levels.",
  openGraph: {
    title: "Private Lessons — DanceWithCeech",
    description: "Book a private 1-on-1 dance lesson with Ceech — in-person at Get Down Dance Studio in San Jose, or virtually via Zoom. Personalized hip-hop instruction for all levels.",
    url: "https://dancewithceech.com/private-lessons",
    siteName: "DanceWithCeech",
    images: [{ url: "https://dancewithceech.com/images/ceech/Teaching-Neck-1-sm.jpg", width: 1200, height: 630, alt: "Private Dance Lessons with Ceech" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Private Lessons — DanceWithCeech",
    description: "Book a private 1-on-1 dance lesson with Ceech — in-person at Get Down Dance Studio in San Jose, or virtually via Zoom. Personalized hip-hop instruction for all levels.",
    images: ["https://dancewithceech.com/images/ceech/Teaching-Neck-1-sm.jpg"],
  },
};

export default function PrivateLessonsPage() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}>

      <Nav />

      {/* HERO */}
      <section className="pt-40 pb-0 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="text-sm font-medium tracking-widest uppercase mb-4" style={{ color: "var(--accent-primary)" }}>
              1-on-1 Instruction
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              Private Lessons<br />with Ceech
            </h1>
            <p className="text-lg leading-relaxed mb-8" style={{ color: "var(--muted)" }}>
              Real-time feedback. Personalized to exactly where you are. Available in-person at Get Down Dance Studio in San Jose — or virtually via Zoom from anywhere in the world.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="#booking"
                className="px-8 py-4 rounded-full text-white font-semibold text-center transition-opacity hover:opacity-90"
                style={{ backgroundColor: "var(--accent-primary)" }}
              >
                Book a Free Consultation
              </a>
              <a
                href="#pricing"
                className="px-8 py-4 rounded-full font-semibold text-center transition-colors hover:text-white"
                style={{ border: "1px solid #333", color: "var(--muted)" }}
              >
                View Pricing
              </a>
            </div>
          </div>
          <div className="flex justify-center md:justify-end">
            <Image
              src="/images/ceech/Teaching-Neck-1-sm.jpg"
              alt="Ceech teaching a private lesson"
              width={500}
              height={400}
              className="rounded-2xl object-cover"
              style={{ maxHeight: '420px', width: '100%', objectFit: 'cover' }}
            />
          </div>
        </div>
      </section>

      {/* WHAT YOU GET */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-sm font-medium tracking-widest uppercase mb-4" style={{ color: "var(--accent-primary)" }}>
              What You Get
            </div>
            <h2 className="text-3xl font-bold">Every lesson is built around you</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "Personalized Curriculum",
                description: "Every lesson is built around your current level, your goals, and the style you want to learn.",
              },
              {
                title: "Real-Time Corrections",
                description: "Ceech watches you move and gives immediate feedback — the kind you can't get from a YouTube video.",
              },
              {
                title: "Any Style, Any Level",
                description: "Hip-hop, locking, popping, breaking, house dance. Complete beginner or seasoned dancer — all welcome.",
              },
            ].map(({ title, description }) => (
              <div key={title} className="rounded-2xl p-6" style={{ backgroundColor: "var(--surface)", border: "1px solid #1f1f1f" }}>
                <div className="w-8 h-1 rounded mb-4" style={{ backgroundColor: "var(--accent-primary)" }} />
                <h3 className="font-bold text-lg mb-2">{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TEACHING VIDEOS */}
      <section className="pb-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-sm font-medium tracking-widest uppercase mb-4" style={{ color: "var(--accent-primary)" }}>
              The Method in Action
            </div>
            <h2 className="text-3xl font-bold mb-3">Watch Ceech teach</h2>
            <p style={{ color: "var(--muted)" }}>Not just performing — actually teaching. This is what your lesson looks like.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { videoId: "6OctgBz5jPU", label: "1-on-1 Final Routine", desc: "Student performing what they learned in a private session" },
              { videoId: "2Xcd7XoI2Vg", label: "Breaking Down the Steps", desc: "Ceech counting through moves with students in real time" },
              { videoId: "kmv1R6y4eH0", label: "3 Drills to Practice", desc: "Simple drills you can follow along at home" },
            ].map(({ videoId, label, desc }) => (
              <div key={videoId}>
                <div className="rounded-2xl overflow-hidden mb-3" style={{ aspectRatio: "9/16", position: "relative" }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}?rel=0`}
                    title={label}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
                  />
                </div>
                <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--accent-primary)" }}>{label}</div>
                <p className="text-sm" style={{ color: "var(--muted)" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LESSON PHOTOS */}
      <section className="pb-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-2">What a lesson looks like</h2>
            <p className="text-sm" style={{ color: "var(--muted)" }}>Hands-on. Specific. No vague instructions.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Image
              src="/images/ceech/Teaching-Neck-1-sm.jpg"
              alt="Ceech correcting neck movement during a private lesson"
              width={600}
              height={400}
              className="rounded-2xl object-cover w-full"
              style={{ height: '280px', objectFit: 'cover' }}
            />
            <Image
              src="/images/ceech/popping-arms.jpg"
              alt="Ceech teaching arm popping technique"
              width={600}
              height={400}
              className="rounded-2xl object-cover w-full"
              style={{ height: '280px', objectFit: 'cover' }}
            />
            <Image
              src="/images/ceech/teaching-knee-pop.jpg"
              alt="Ceech teaching knee pop footwork"
              width={600}
              height={400}
              className="rounded-2xl object-cover w-full sm:col-span-2"
              style={{ height: '280px', objectFit: 'cover' }}
            />
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section className="py-16 px-6" style={{ backgroundColor: "var(--surface)", borderTop: "1px solid #1f1f1f", borderBottom: "1px solid #1f1f1f" }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Who private lessons are for</h2>
          <div className="flex flex-col gap-4 text-left max-w-xl mx-auto">
            {[
              "You want to learn faster than a group class allows",
              "You're too self-conscious to dance in front of others yet",
              "You have a specific move or style you want to master",
              "You've been dancing for years but hit a plateau",
              "You want direct, honest feedback — not just encouragement",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <span style={{ color: "var(--accent-primary)" }}>→</span>
                <span style={{ color: "var(--muted)" }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 px-6" style={{ backgroundColor: "var(--background)" }}>
        <div className="text-center mb-12">
          <div className="text-sm font-medium tracking-widest uppercase mb-4" style={{ color: "var(--accent-primary)" }}>
            Student Results
          </div>
          <h2 className="text-3xl md:text-4xl font-bold">Real students. Real progress.</h2>
          <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>Click any card to watch on YouTube</p>
        </div>
        <div className="max-w-4xl mx-auto">
          <TestimonialsCarousel />
        </div>
      </section>

      {/* PRICING */}
      <div id="pricing">
        <PrivateLessonsPricing />
      </div>

      <VideoEvalForm />

      {/* BOOKING */}
      <section id="booking" className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <div className="text-sm font-medium tracking-widest uppercase mb-4" style={{ color: "var(--accent-primary)" }}>
            Let&apos;s Talk
          </div>
          <h2 className="text-3xl font-bold mb-4">Start with a free 30-minute consultation</h2>
          <p className="mb-3" style={{ color: "var(--muted)" }}>
            We&apos;ll talk through your goals, experience level, and what you want to learn — then build a plan around you. No obligation.
          </p>
          <p style={{ color: "var(--muted)" }}>
            Or skip the form and text me directly:{" "}
            <a
              href="sms:4086573771"
              className="font-semibold hover:text-white transition-colors"
              style={{ color: "var(--accent-primary)" }}
            >
              (408) 657-3771
            </a>
          </p>
        </div>

        <div className="max-w-3xl mx-auto rounded-2xl overflow-hidden" style={{ border: "1px solid #1f1f1f" }}>
          <iframe
            src="https://calendly.com/ceechhsu/30min"
            width="100%"
            height="700"
            frameBorder="0"
            title="Book a private lesson with Ceech"
          />
        </div>

        <div className="text-center mt-8">
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Questions?{" "}
            <a href="sms:4086573771" className="hover:text-white transition-colors" style={{ color: "var(--accent-primary)" }}>
              Text (408) 657-3771
            </a>
            {" "}or{" "}
            <Link href="/contact" className="hover:text-white transition-colors" style={{ color: "var(--accent-primary)" }}>
              send a message
            </Link>
          </p>
        </div>
      </section>

      <Footer />

    </main>
  );
}
