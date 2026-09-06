import { LessonFaqs } from "@/components/PrivateLessonDetails";
import { buildLessonSchema, sanJoseFaqs } from "@/lib/private-lesson-details";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Link from "next/link";
import { formatReviewProof, getReviewSummary } from "@/lib/reviews";

export const metadata = {
  title: "Hip-Hop Dance Lessons in San Jose | DanceWithCeech",
  description: "Book private hip-hop dance lessons in San Jose with Ceech at Get Down Dance Studios. Beginner-friendly coaching, personal feedback, and a free consultation.",
  alternates: { canonical: "https://dancewithceech.com/private-lessons/san-jose" },
  openGraph: {
    title: "Hip-Hop Dance Lessons in San Jose | DanceWithCeech",
    description: "Private hip-hop dance lessons in San Jose, CA — taught by Ceech at Get Down Dance Studios. Free 30-minute phone consultation.",
    url: "https://dancewithceech.com/private-lessons/san-jose",
    siteName: "Dance With Ceech",
    images: [{ url: "https://dancewithceech.com/images/ceech/ceech-teaching-private-student-neck-control.jpg", width: 1200, height: 630, alt: "Private dance lessons in San Jose with Ceech" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hip-Hop Dance Lessons in San Jose | DanceWithCeech",
    description: "Private hip-hop dance lessons in San Jose, CA — taught by Ceech at Get Down Dance Studios. Free 30-minute phone consultation.",
    images: ["https://dancewithceech.com/images/ceech/ceech-teaching-private-student-neck-control.jpg"],
  },
};

export default async function SanJosePrivateLessonsPage() {
  const reviewSummary = await getReviewSummary();

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildLessonSchema("/private-lessons/san-jose", "San Jose private dance lessons", sanJoseFaqs, false)).replace(/</g, "\\u003c") }} />

      <Nav />

      {/* HERO */}
      <section className="pt-40 pb-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-sm font-medium tracking-widest uppercase mb-4" style={{ color: "var(--accent-primary)" }}>
            San Jose, CA
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight text-balance">
            Private Hip-Hop Dance Lessons in San Jose
          </h1>
          <p className="text-lg leading-relaxed mb-8" style={{ color: "var(--muted)" }}>
            1-on-1 private dance lessons in San Jose, taught by Ceech — a UC Berkeley engineer who has taught dance since 1998 with direct Electric Boogaloos lineage. Hip-hop, locking, popping, breaking, and house dance. In-person at <a href="https://getdowndancestudios.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--foreground)', textDecoration: 'underline' }}>Get Down Dance Studios</a> in Japantown.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="#booking"
              className="px-8 py-4 rounded-full text-white font-semibold text-center transition-opacity hover:opacity-90"
              style={{ backgroundColor: "var(--accent-primary)" }}
            >
              Book a Free 30-Minute Phone Consultation
            </a>
            <a
              href="sms:4086573771"
              className="px-8 py-4 rounded-full font-semibold text-center transition-colors hover:text-white"
              style={{ border: "1px solid #333", color: "var(--muted)" }}
            >
              Text (408) 657-3771
            </a>
          </div>
        </div>
      </section>

      {/* WHY SAN JOSE */}
      <section className="py-16 px-6" style={{ borderTop: "1px solid #1f1f1f" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-balance">Why train with Ceech in San Jose</h2>
          <div className="space-y-5 text-lg leading-relaxed" style={{ color: "var(--muted)" }}>
            <p>
              San Jose has a surprisingly deep dance scene for a tech-heavy city, but finding an instructor who actually teaches the <em>foundation</em> — not just copy-the-choreography — is rare. I&apos;ve held college faculty positions at Mission College, West Valley College, Gavilan College, and Cabrillo College. I&apos;ve also guest taught at Stanford, UC Berkeley, UC Santa Cruz, Santa Clara University, De Anza College, San Jose City College, and Ohlone College. My teaching approach comes from engineering: diagnose the movement problem, apply the right technique, and build up systematically.
            </p>
            <p>
              My funk styles lineage traces directly to the Electric Boogaloos (Pop&apos;in Pete, Skeeter Rabbit) — the crew that invented popping. That means when you learn popping, waving, or boogaloo from me, you&apos;re learning the real thing, not a watered-down studio version.
            </p>
            <p>
              Lessons happen at <strong style={{ color: "var(--foreground)" }}>Get Down Dance Studios at 196 Jackson St</strong> in Japantown, a professional studio with sprung floors, mirrors, and sound, a few minutes from downtown San Jose. Paid street parking only. Check posted signs for fees and time limits, and allow time to park.
            </p>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="py-16 px-6" style={{ borderTop: "1px solid #1f1f1f" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-balance">Trusted by San Jose dancers</h2>
          <p className="text-lg leading-relaxed mb-4" style={{ color: "var(--muted)" }}>
            {formatReviewProof(reviewSummary)}
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <a
              href="https://www.yelp.com/biz/dance-with-ceech-san-jose-3"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 rounded-full transition-colors hover:opacity-90"
              style={{ backgroundColor: "var(--surface)", border: "1px solid #1f1f1f", color: "var(--accent-primary)" }}
            >
              Read Yelp Reviews →
            </a>
            <a
              href="https://maps.app.goo.gl/UwJFWssFCYNC5Zyc7"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 rounded-full transition-colors hover:opacity-90"
              style={{ backgroundColor: "var(--surface)", border: "1px solid #1f1f1f", color: "var(--accent-primary)" }}
            >
              Read Google Reviews →
            </a>
          </div>
        </div>
      </section>

      {/* PRICING LINK */}
      <section className="py-16 px-6" style={{ borderTop: "1px solid #1f1f1f" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-balance">Pricing</h2>
          <p className="text-lg leading-relaxed mb-6" style={{ color: "var(--muted)" }}>
            In-person 60-min lessons at Get Down Dance Studios, San Jose. Studio fee included:
          </p>
          <ul className="space-y-3 text-lg" style={{ color: "var(--muted)" }}>
            <li><strong style={{ color: "var(--foreground)" }}>10-Pack:</strong> $2,100 ($210/session — save $400) <em className="text-sm">Most popular</em></li>
            <li><strong style={{ color: "var(--foreground)" }}>5-Pack:</strong> $1,150 ($230/session)</li>
            <li><strong style={{ color: "var(--foreground)" }}>Single Session:</strong> $250</li>
          </ul>
          <p className="mt-6" style={{ color: "var(--muted)" }}>
            <Link href="/private-lessons#video-eval" aria-label="Free video evaluation for prospective virtual students" className="hover:text-white transition-colors" style={{ color: "var(--accent-primary)" }}>
              Free video evaluation for prospective virtual students
            </Link>.
          </p>
        </div>
      </section>

      <LessonFaqs faqs={sanJoseFaqs} />

      {/* BOOKING */}
      <section id="booking" className="py-24 px-6" style={{ borderTop: "1px solid #1f1f1f" }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4 text-balance">Book your free 30-minute phone consultation</h2>
          <p className="mb-3" style={{ color: "var(--muted)" }}>
            We&apos;ll go over your goals, experience level, and schedule your first lesson in San Jose.
          </p>
          <p style={{ color: "var(--muted)" }}>
            Or skip the form and text me directly:{" "}
            <a href="sms:4086573771" className="font-semibold hover:text-white transition-colors" style={{ color: "var(--accent-primary)" }}>
              (408) 657-3771
            </a>
          </p>
        </div>

        <div className="max-w-3xl mx-auto mt-8 rounded-2xl overflow-hidden" style={{ border: "1px solid #1f1f1f" }}>
          <iframe
            src="https://calendly.com/ceechhsu/30min"
            width="100%"
            className="h-[700px]"
            style={{ border: 0 }}
            title="Free 30-minute phone consultation with Ceech in San Jose"
          />
        </div>
      </section>

      {/* LOCATION */}
      <section className="py-16 px-6" style={{ borderTop: "1px solid #1f1f1f" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-balance">Where we train</h2>
          <div className="mb-6">
            <a href="https://getdowndancestudios.com/" target="_blank" rel="noopener noreferrer" className="text-lg font-medium mb-1 hover:underline block" style={{ color: 'var(--foreground)' }}>
              Get Down Dance Studios
            </a>
            <p className="mb-4" style={{ color: "var(--muted)" }}>
              196 Jackson St<br />
              San Jose, CA 95112<br />
              Japantown
            </p>
            <a
              href="https://maps.app.goo.gl/UwJFWssFCYNC5Zyc7"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm px-4 py-2 rounded-full transition-colors hover:opacity-90"
              style={{ backgroundColor: "var(--surface)", border: "1px solid #1f1f1f", color: "var(--accent-primary)" }}
            >
              View on Google Maps →
            </a>
          </div>
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1f1f1f" }}>
            <iframe
              src="https://www.google.com/maps?q=37.3488633,-121.8944247&output=embed"
              width="100%"
              height="300"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Get Down Dance Studios location in San Jose"
            />
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
