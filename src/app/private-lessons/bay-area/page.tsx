import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Link from "next/link";

export const metadata = {
  title: "Hip Hop Dance Classes in the Bay Area — Private Lessons with Ceech",
  description: "Private hip-hop dance lessons serving the Bay Area — in-person in San Jose, virtual via Zoom. Electric Boogaloos-trained instructor, 25+ years teaching Bay Area community colleges. Free consultation.",
  alternates: { canonical: "https://dancewithceech.com/private-lessons/bay-area" },
  openGraph: {
    title: "Hip Hop Dance Classes in the Bay Area — Private Lessons with Ceech",
    description: "Private hip-hop dance lessons serving the Bay Area — in-person in San Jose, virtual via Zoom. Taught by Ceech.",
    url: "https://dancewithceech.com/private-lessons/bay-area",
    siteName: "DanceWithCeech",
    images: [{ url: "https://dancewithceech.com/images/ceech/Teaching-Neck-1-sm.jpg", width: 1200, height: 630, alt: "Bay Area private dance lessons with Ceech" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hip Hop Dance Classes in the Bay Area — Private Lessons with Ceech",
    description: "Private hip-hop dance lessons serving the Bay Area — in-person in San Jose, virtual via Zoom. Taught by Ceech.",
    images: ["https://dancewithceech.com/images/ceech/Teaching-Neck-1-sm.jpg"],
  },
};

const danceSchoolSchema = {
  "@context": "https://schema.org",
  "@type": "DanceSchool",
  "name": "DanceWithCeech — Bay Area Private Lessons",
  "url": "https://dancewithceech.com/private-lessons/bay-area",
  "telephone": "+14086573771",
  "email": "dancewithceech@gmail.com",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "196 Jackson St",
    "addressLocality": "San Jose",
    "addressRegion": "CA",
    "postalCode": "95112",
    "addressCountry": "US"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 37.3382,
    "longitude": -121.8863
  },
  "areaServed": [
    { "@type": "City", "name": "San Jose" },
    { "@type": "City", "name": "Sunnyvale" },
    { "@type": "City", "name": "Santa Clara" },
    { "@type": "City", "name": "Cupertino" },
    { "@type": "City", "name": "Mountain View" },
    { "@type": "City", "name": "Palo Alto" },
    { "@type": "City", "name": "Fremont" },
    { "@type": "City", "name": "Milpitas" },
    { "@type": "City", "name": "Oakland" },
    { "@type": "City", "name": "San Francisco" }
  ],
  "priceRange": "$80–$250 per session",
  "description": "Private hip-hop, locking, popping, breaking, and house dance lessons serving the San Francisco Bay Area — in-person in San Jose or virtual anywhere. Taught by Ceech, a 25-year instructor with Electric Boogaloos lineage.",
  "sameAs": [
    "https://www.instagram.com/dancewithceech",
    "https://www.tiktok.com/@dancewithceech",
    "https://www.youtube.com/@dancewithceech",
    "https://www.facebook.com/dancewithceech"
  ]
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Do you travel to other Bay Area cities for private lessons?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "In-person lessons happen at Get Down Dance Studios in San Jose (Japantown). For students in Sunnyvale, Cupertino, Palo Alto, Fremont, Santa Clara, Mountain View, and the broader South Bay, the studio is typically a 15-30 minute drive. For students further away (San Francisco, Oakland, Marin), virtual lessons via Zoom are available — same personalized feedback from anywhere."
      }
    },
    {
      "@type": "Question",
      "name": "Which Bay Area colleges have you taught at?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "I've taught at De Anza College, Evergreen Valley College, West Valley College, and Mission College — four of the largest community colleges in the South Bay — for over 25 years. Most of my students over that period have been working adults, not pre-professional dancers."
      }
    },
    {
      "@type": "Question",
      "name": "How much do Bay Area private dance lessons cost?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "In-person at Get Down Dance Studios in San Jose: Single 60-min session $250, 5-Pack $1,150 ($230/session), 10-Pack $2,100 ($210/session — most popular). Virtual lessons via Zoom: Single 30-min $80, Monthly Pack $280 for 4 sessions. Free 15-min consultation for all new students."
      }
    },
    {
      "@type": "Question",
      "name": "Do you offer virtual lessons for students outside the South Bay?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes — virtual 30-minute lessons via Zoom or Google Meet are available for students anywhere in the Bay Area and beyond. $80 for a single session or $280/month for 4 sessions. Same real-time corrections and feedback as in-person."
      }
    },
    {
      "@type": "Question",
      "name": "What styles can I learn in the Bay Area with you?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Hip-hop, locking, popping, breaking, and house dance — all the core street styles — plus salsa and bachata on request. I trained directly under Pop'in Pete and Skeeter Rabbit of the Electric Boogaloos, which gives my funk-styles teaching (popping, locking, waving) an authentic lineage most Bay Area instructors can't match."
      }
    }
  ]
};

export default function BayAreaPrivateLessonsPage() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(danceSchoolSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

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
            1-on-1 private dance lessons serving the entire Bay Area — in-person at Get Down Dance Studios in San Jose, or virtually via Zoom from anywhere. Taught by Ceech, a 25-year Bay Area instructor with direct Electric Boogaloos lineage. Hip-hop, locking, popping, breaking, and house.
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
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-balance">Serving the Bay Area for 25+ years</h2>
          <div className="space-y-5 text-lg leading-relaxed" style={{ color: "var(--muted)" }}>
            <p>
              The Bay Area has a vibrant but fragmented dance scene — studios in San Francisco focus on contemporary and jazz; South Bay options skew toward ballroom and K-pop. If you&apos;re looking for <em>actual street dance</em> — hip-hop, locking, popping, breaking, house — with an instructor who trained under the people who created the styles, the options narrow fast.
            </p>
            <p>
              I&apos;ve taught at four Bay Area community colleges (De Anza, Evergreen Valley, West Valley, Mission) for over 25 years. My funk styles lineage traces directly to Pop&apos;in Pete and Skeeter Rabbit of the Electric Boogaloos — the crew that invented popping. When you learn from me, you&apos;re learning the real thing from someone a handshake away from the original sources.
            </p>
            <p>
              In-person lessons are at <strong style={{ color: "var(--foreground)" }}>Get Down Dance Studios in San Jose Japantown</strong> — central enough for students from Sunnyvale, Cupertino, Palo Alto, Santa Clara, Mountain View, Fremont, and Milpitas. For students farther out, <strong style={{ color: "var(--foreground)" }}>virtual lessons via Zoom</strong> deliver the same personalized feedback.
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
            For students in San Francisco, Oakland, Marin, or the East Bay, I strongly recommend starting with virtual lessons via Zoom — the feedback and results are nearly identical, and you save 2 hours of driving per session.
          </p>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="py-16 px-6" style={{ borderTop: "1px solid #1f1f1f" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-balance">Trusted by Bay Area students</h2>
          <p className="text-lg leading-relaxed mb-4" style={{ color: "var(--muted)" }}>
            30 five-star reviews on Yelp. 56 five-star reviews on Google. Community college classrooms full of adult learners for a quarter of a century. All of it earned.
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <a
              href="https://www.yelp.com/biz/dance-with-ceech-san-jose"
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
              <ul className="space-y-2" style={{ color: "var(--muted)" }}>
                <li><strong style={{ color: "var(--foreground)" }}>10-Pack:</strong> $2,100 ($210/sess)</li>
                <li><strong style={{ color: "var(--foreground)" }}>5-Pack:</strong> $1,150 ($230/sess)</li>
                <li><strong style={{ color: "var(--foreground)" }}>Single:</strong> $250/60 min</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-3">Virtual (Anywhere in Bay Area)</h3>
              <ul className="space-y-2" style={{ color: "var(--muted)" }}>
                <li><strong style={{ color: "var(--foreground)" }}>Monthly Pack:</strong> $280 for 4 × 30-min</li>
                <li><strong style={{ color: "var(--foreground)" }}>Single:</strong> $80/30 min</li>
              </ul>
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

      {/* BOOKING */}
      <section id="booking" className="py-24 px-6" style={{ borderTop: "1px solid #1f1f1f" }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4 text-balance">Book your free 15-min consultation</h2>
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
            title="Book a private dance lesson in the Bay Area with Ceech"
          />
        </div>
      </section>

      <Footer />
    </main>
  );
}
