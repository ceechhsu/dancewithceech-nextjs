import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Script from "next/script";
import ContactForm from "./ContactForm";

export const metadata = {
  title: "Contact — DanceWithCeech",
  description: "Get in touch with Ceech for questions about dance classes, private lessons, or anything else.",
};

const schema = {
  "@context": "https://schema.org",
  "@type": "DanceSchool",
  "name": "DanceWithCeech",
  "url": "https://dancewithceech.com",
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
  "sameAs": [
    "https://maps.app.goo.gl/UwJFWssFCYNC5Zyc7"
  ],
  "description": "Hip-hop dance classes for adults in San Jose, CA. Learn locking, popping, breaking, and house dance with instructor Ceech.",
  "priceRange": "$$"
};

export default function ContactPage() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}>
      <Script
        id="business-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <Nav />

      {/* HEADER */}
      <section className="pt-40 pb-16 px-6 text-center">
        <div className="text-sm font-medium tracking-widest uppercase mb-4" style={{ color: "var(--accent-primary)" }}>
          Get In Touch
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Contact Ceech</h1>
        <p className="text-lg max-w-xl mx-auto" style={{ color: "var(--muted)" }}>
          Questions about classes, private lessons, or just want to say hello — reach out anytime.
        </p>
      </section>

      {/* CONTENT */}
      <section className="pb-24 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">

          {/* CONTACT INFO */}
          <div className="flex flex-col gap-8">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>Email</div>
              <a href="mailto:dancewithceech@gmail.com" className="text-lg font-medium hover:text-blue-400 transition-colors" style={{ color: "var(--foreground)" }}>
                dancewithceech@gmail.com
              </a>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>Phone</div>
              <a href="tel:4086573771" className="text-lg font-medium hover:text-blue-400 transition-colors" style={{ color: "var(--foreground)" }}>
                (408) 657-3771
              </a>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>Studio</div>
              <div className="text-lg font-medium mb-1">Get Down Dance Studio</div>
              <p className="mb-3" style={{ color: "var(--muted)" }}>
                196 Jackson St<br />
                San Jose, CA 95112
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

            {/* MAP EMBED */}
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1f1f1f" }}>
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3172.3!2d-121.8863!3d37.3382!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2s196+Jackson+St%2C+San+Jose%2C+CA+95112!5e0!3m2!1sen!2sus!4v1"
                width="100%"
                height="220"
                style={{ border: 0, filter: "invert(90%) hue-rotate(180deg)" }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Get Down Dance Studio location"
              />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>Follow Along</div>
              <div className="flex flex-col gap-2 text-sm" style={{ color: "var(--muted)" }}>
                <a href="https://www.youtube.com/@dancewithceech" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">YouTube</a>
                <a href="https://www.tiktok.com/@dancewithceech" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">TikTok</a>
                <a href="https://www.instagram.com/dancewithceech" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Instagram</a>
                <a href="https://www.facebook.com/dancewithceech" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Facebook</a>
              </div>
            </div>
          </div>

          {/* CONTACT FORM */}
          {/* TODO Phase 2: Wire up to Resend API route for email delivery */}
          <ContactForm />

        </div>
      </section>

      <Footer />

    </main>
  );
}
