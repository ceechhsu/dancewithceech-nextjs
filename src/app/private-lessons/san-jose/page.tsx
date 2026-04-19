import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Hip Hop Dance Lessons in San Jose — Private 1-on-1 with Ceech",
  description: "Private hip-hop dance lessons in San Jose, CA — in-person at Get Down Dance Studios in Japantown. Taught by Ceech, a 25-year instructor with Electric Boogaloos lineage. Free 15-min consultation.",
  alternates: { canonical: "https://dancewithceech.com/private-lessons/san-jose" },
  openGraph: {
    title: "Hip Hop Dance Lessons in San Jose — Private 1-on-1 with Ceech",
    description: "Private hip-hop dance lessons in San Jose, CA — taught by Ceech at Get Down Dance Studios. Free 15-min consultation.",
    url: "https://dancewithceech.com/private-lessons/san-jose",
    siteName: "DanceWithCeech",
    images: [{ url: "https://dancewithceech.com/images/ceech/Teaching-Neck-1-sm.jpg", width: 1200, height: 630, alt: "Private dance lessons in San Jose with Ceech" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hip Hop Dance Lessons in San Jose — Private 1-on-1 with Ceech",
    description: "Private hip-hop dance lessons in San Jose, CA — taught by Ceech at Get Down Dance Studios. Free 15-min consultation.",
    images: ["https://dancewithceech.com/images/ceech/Teaching-Neck-1-sm.jpg"],
  },
};

const danceSchoolSchema = {
  "@context": "https://schema.org",
  "@type": "DanceSchool",
  "name": "DanceWithCeech — San Jose Private Lessons",
  "url": "https://dancewithceech.com/private-lessons/san-jose",
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
    { "@type": "City", "name": "Mountain View" }
  ],
  "priceRange": "$80–$250 per session",
  "description": "Private hip-hop, locking, popping, breaking, and house dance lessons in San Jose, CA — taught by Ceech, a 25-year instructor with Electric Boogaloos lineage.",
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
      "name": "Where in San Jose do you teach private dance lessons?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "I teach private lessons at Get Down Dance Studios, 196 Jackson St, San Jose, CA 95112 — in the heart of Japantown, a few minutes from downtown San Jose. Free street parking is usually easy to find."
      }
    },
    {
      "@type": "Question",
      "name": "Do you teach dance styles besides hip-hop in San Jose?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes — I teach hip-hop, locking, popping, breaking, house dance, salsa, and bachata. The foundation I trained under is the funk styles (locking, popping, boogaloo) from Pop'in Pete and Skeeter Rabbit of the Electric Boogaloos."
      }
    },
    {
      "@type": "Question",
      "name": "How much do private hip-hop dance lessons cost in San Jose?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "In-person lessons at Get Down Dance Studios in San Jose: Single 60-min session $250, 5-Pack $1,150 ($230/session), 10-Pack $2,100 ($210/session — our most popular option). A free 15-min consultation is always the first step."
      }
    },
    {
      "@type": "Question",
      "name": "Do you offer lessons for absolute beginners in San Jose?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes — about half my students are absolute beginners. I've taught at 4 Bay Area community colleges for 25+ years and specialize in adults who think they 'can't dance.' The first free consultation maps out a plan for exactly where you are."
      }
    },
    {
      "@type": "Question",
      "name": "How do I book a private dance lesson in San Jose?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Text me directly at (408) 657-3771 or book a free 15-minute consultation online. After the consultation, we schedule your first lesson or demo at Get Down Dance Studios."
      }
    }
  ]
};

export default function SanJosePrivateLessonsPage() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(danceSchoolSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

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
            1-on-1 private dance lessons in San Jose, taught by Ceech — a UC Berkeley engineer turned 25-year dance instructor with direct Electric Boogaloos lineage. Hip-hop, locking, popping, breaking, and house dance. In-person at <a href="https://getdowndancestudios.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--foreground)', textDecoration: 'underline' }}>Get Down Dance Studios</a> in Japantown.
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

      {/* WHY SAN JOSE */}
      <section className="py-16 px-6" style={{ borderTop: "1px solid #1f1f1f" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-balance">Why train with Ceech in San Jose</h2>
          <div className="space-y-5 text-lg leading-relaxed" style={{ color: "var(--muted)" }}>
            <p>
              San Jose has a surprisingly deep dance scene for a tech-heavy city, but finding an instructor who actually teaches the <em>foundation</em> — not just copy-the-choreography — is rare. I've taught at De Anza, Evergreen Valley College, West Valley College, and Mission College in the Bay Area for over 25 years, and my teaching approach comes from engineering: diagnose the movement problem, apply the right technique, build up systematically.
            </p>
            <p>
              My funk styles lineage traces directly to the Electric Boogaloos (Pop'in Pete, Skeeter Rabbit) — the crew that invented popping. That means when you learn popping, waving, or boogaloo from me, you're learning the real thing, not a watered-down studio version.
            </p>
            <p>
              Lessons happen at <strong style={{ color: "var(--foreground)" }}>Get Down Dance Studios at 196 Jackson St</strong> in Japantown — a professional studio with sprung floors, mirrors, and sound, a few minutes from downtown San Jose. Free street parking is usually easy to find.
            </p>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="py-16 px-6" style={{ borderTop: "1px solid #1f1f1f" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-balance">Trusted by San Jose dancers</h2>
          <p className="text-lg leading-relaxed mb-4" style={{ color: "var(--muted)" }}>
            30 five-star reviews on Yelp. 56 five-star reviews on Google. All earned, all from real students.
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

      {/* PRICING LINK */}
      <section className="py-16 px-6" style={{ borderTop: "1px solid #1f1f1f" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-balance">Pricing</h2>
          <p className="text-lg leading-relaxed mb-6" style={{ color: "var(--muted)" }}>
            In-person 60-min lessons at Get Down Dance Studios, San Jose:
          </p>
          <ul className="space-y-3 text-lg" style={{ color: "var(--muted)" }}>
            <li><strong style={{ color: "var(--foreground)" }}>10-Pack:</strong> $2,100 ($210/session — save $400) <em className="text-sm">Most popular</em></li>
            <li><strong style={{ color: "var(--foreground)" }}>5-Pack:</strong> $1,150 ($230/session)</li>
            <li><strong style={{ color: "var(--foreground)" }}>Single Session:</strong> $250</li>
          </ul>
          <p className="mt-6" style={{ color: "var(--muted)" }}>
            See all options including virtual lessons and video evaluations on the{" "}
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
            title="Book a private dance lesson in San Jose with Ceech"
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
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3172.3!2d-121.8863!3d37.3382!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2s196+Jackson+St%2C+San+Jose%2C+CA+95112!5e0!3m2!1sen!2sus!4v1"
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
