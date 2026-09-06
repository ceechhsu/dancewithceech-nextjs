import { LessonFaqs } from "@/components/PrivateLessonDetails";
import { buildLessonSchema, bayAreaFaqs } from "@/lib/private-lesson-details";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Link from "next/link";
import { formatReviewProof, getReviewSummary } from "@/lib/reviews";

export const metadata = {
  title: "Bay Area Hip-Hop Dance Lessons | DanceWithCeech",
  description: "Find private hip-hop dance lessons for Bay Area adults—in person in San Jose or online. Train with Ceech through clear foundations and personal feedback.",
  alternates: { canonical: "https://dancewithceech.com/private-lessons/bay-area" },
  openGraph: {
    title: "Bay Area Hip-Hop Dance Lessons | DanceWithCeech",
    description: "Private hip-hop dance lessons serving the Bay Area, in person in San Jose or virtually through Google Meet. Taught by Ceech.",
    url: "https://dancewithceech.com/private-lessons/bay-area",
    siteName: "Dance With Ceech",
    images: [{ url: "https://dancewithceech.com/images/ceech/ceech-teaching-private-student-neck-control.jpg", width: 1200, height: 630, alt: "Bay Area private dance lessons with Ceech" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bay Area Hip-Hop Dance Lessons | DanceWithCeech",
    description: "Private hip-hop dance lessons serving the Bay Area, in person in San Jose or virtually through Google Meet. Taught by Ceech.",
    images: ["https://dancewithceech.com/images/ceech/ceech-teaching-private-student-neck-control.jpg"],
  },
};

export default async function BayAreaPrivateLessonsPage() {
  const reviewSummary = await getReviewSummary();

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildLessonSchema("/private-lessons/bay-area", "Bay Area private dance lessons", bayAreaFaqs, true)).replace(/</g, "\\u003c") }} />

      <Nav />

      {/* HERO */}
      <section className="pt-40 pb-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-sm font-medium tracking-widest uppercase mb-4" style={{ color: "var(--accent-primary)" }}>
            San Francisco Bay Area
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight text-balance">
            Private Hip-Hop Dance Lessons for the Bay Area
          </h1>
          <p className="text-lg leading-relaxed mb-8" style={{ color: "var(--muted)" }}>
            1-on-1 private dance lessons serving the entire Bay Area, in person at Get Down Dance Studios in San Jose or virtually through Google Meet from anywhere. Taught by Ceech, a Bay Area dance instructor teaching since 1998 with direct Electric Boogaloos lineage. Hip-hop, locking, popping, breaking, and house.
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

      {/* WHY BAY AREA */}
      <section className="py-16 px-6" style={{ borderTop: "1px solid #1f1f1f" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-balance">Teaching in the Bay Area since 1998</h2>
          <div className="space-y-5 text-lg leading-relaxed" style={{ color: "var(--muted)" }}>
            <p>
              The Bay Area has a vibrant but fragmented dance scene — studios in San Francisco focus on contemporary and jazz; South Bay options skew toward ballroom and K-pop. If you&apos;re looking for <em>actual street dance</em> — hip-hop, locking, popping, breaking, house — with an instructor who trained under the people who created the styles, the options narrow fast.
            </p>
            <p>
              I&apos;ve held college faculty positions at Mission College, West Valley College, Gavilan College, and Cabrillo College, and I&apos;ve guest taught at Stanford, UC Berkeley, UC Santa Cruz, Santa Clara University, De Anza College, San Jose City College, and Ohlone College. My funk styles lineage traces directly to Pop&apos;in Pete and Skeeter Rabbit of the Electric Boogaloos — the crew that invented popping. When you learn from me, you&apos;re learning the real thing from someone a handshake away from the original sources.
            </p>
            <p>
              In-person lessons are at <strong style={{ color: "var(--foreground)" }}>Get Down Dance Studios in San Jose Japantown</strong>, central enough for students from Sunnyvale, Cupertino, Palo Alto, Santa Clara, Mountain View, Fremont, and Milpitas. For students farther out, <strong style={{ color: "var(--foreground)" }}>virtual coaching through Google Meet</strong> provides personalized video feedback and live instruction.
            </p>
          </div>
        </div>
      </section>

      {/* AREAS SERVED */}
      <section className="py-16 px-6" style={{ borderTop: "1px solid #1f1f1f" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-balance">Students come from across the Bay</h2>
          <p className="text-lg leading-relaxed mb-4" style={{ color: "var(--muted)" }}>
            Typical drive times to Get Down Dance Studios, San Jose (Japantown):
          </p>
          <ul className="space-y-2 text-base" style={{ color: "var(--muted)" }}>
            <li><strong style={{ color: "var(--foreground)" }}>San Jose</strong> — 0-15 min</li>
            <li><strong style={{ color: "var(--foreground)" }}>Santa Clara / Sunnyvale</strong> — 15-25 min</li>
            <li><strong style={{ color: "var(--foreground)" }}>Cupertino / Mountain View</strong> — 20-30 min</li>
            <li><strong style={{ color: "var(--foreground)" }}>Milpitas / Fremont</strong> — 15-25 min</li>
            <li><strong style={{ color: "var(--foreground)" }}>Palo Alto / Los Altos</strong> — 25-35 min</li>
            <li><strong style={{ color: "var(--foreground)" }}>Oakland / San Francisco</strong> — 50-60 min (virtual recommended)</li>
          </ul>
          <p className="mt-6 text-base" style={{ color: "var(--muted)" }}>
            For students in San Francisco, Oakland, Marin, or the East Bay, I strongly recommend starting with virtual coaching through Google Meet. You receive personalized video feedback and live instruction without spending hours driving to San Jose.
          </p>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="py-16 px-6" style={{ borderTop: "1px solid #1f1f1f" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-balance">Trusted by Bay Area students</h2>
          <p className="text-lg leading-relaxed mb-4" style={{ color: "var(--muted)" }}>
            {formatReviewProof(reviewSummary, "Teaching adults in college classrooms since 2002.")}
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

      {/* PRICING */}
      <section className="py-16 px-6" style={{ borderTop: "1px solid #1f1f1f" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-balance">Pricing</h2>
          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">In-Person (San Jose)</h3>
              <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>60-minute lessons. Studio fee included.</p>
              <ul className="space-y-2" style={{ color: "var(--muted)" }}>
                <li><strong style={{ color: "var(--foreground)" }}>10-Pack:</strong> $2,100 ($210/sess)</li>
                <li><strong style={{ color: "var(--foreground)" }}>5-Pack:</strong> $1,150 ($230/sess)</li>
                <li><strong style={{ color: "var(--foreground)" }}>Single:</strong> $250/60 min</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-3">Virtual (Available Worldwide)</h3>
              <ul className="space-y-2" style={{ color: "var(--muted)" }}>
                <li><strong style={{ color: "var(--foreground)" }}>10-Cycle Pack:</strong> $500 ($50/cycle, use within six months of purchase)</li>
                <li><strong style={{ color: "var(--foreground)" }}>5-Cycle Pack:</strong> $300 ($60/cycle, use within three months of purchase)</li>
                <li><strong style={{ color: "var(--foreground)" }}>Single Cycle:</strong> $80</li>
              </ul>
              <p className="mt-4 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                One complete cycle includes one video submission, private recorded feedback within three business days, and one 30-minute Live Coaching Session on Google Meet. After receiving feedback, arrange your next available Google Meet with Ceech. All options are one-time purchases with no automatic renewal.
              </p>
              <p className="mt-4 text-sm">
                <Link href="/private-lessons#video-eval" aria-label="Free video evaluation for prospective virtual students" className="hover:text-white transition-colors" style={{ color: "var(--accent-primary)" }}>
                  Free video evaluation for prospective virtual students
                </Link>
              </p>
            </div>
          </div>
          <p className="mt-6" style={{ color: "var(--muted)" }}>
            Full details on the{" "}
            <Link href="/private-lessons" className="hover:text-white transition-colors" style={{ color: "var(--accent-primary)" }}>
              main private lessons page
            </Link>.
          </p>
        </div>
      </section>

      <LessonFaqs faqs={bayAreaFaqs} />

      {/* BOOKING */}
      <section id="booking" className="py-24 px-6" style={{ borderTop: "1px solid #1f1f1f" }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4 text-balance">Book your free 30-minute phone consultation</h2>
          <p className="mb-3" style={{ color: "var(--muted)" }}>
            We&apos;ll talk through your goals, experience level, and whether in-person or virtual is the right fit.
          </p>
          <p style={{ color: "var(--muted)" }}>
            Or text me directly:{" "}
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
            title="Free 30-minute phone consultation with Ceech for Bay Area students"
          />
        </div>
      </section>

      <Footer />
    </main>
  );
}
