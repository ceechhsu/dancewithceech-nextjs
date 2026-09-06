import { businessSchema } from "@/lib/private-lesson-details";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ContactForm from "./ContactForm";

export const metadata = {
  title: "Contact Ceech | San Jose Dance Lessons | DanceWithCeech",
  description: "Contact Ceech about private hip-hop lessons, online dance training, or classes at Get Down Dance Studios in San Jose, California.",
  alternates: { canonical: "https://dancewithceech.com/contact" },
  openGraph: {
    title: "Contact Ceech | San Jose Dance Lessons | DanceWithCeech",
    description: "Contact Ceech about private hip-hop lessons, online dance training, or San Jose classes.",
    url: "https://dancewithceech.com/contact",
    siteName: "Dance With Ceech",
    images: [{ url: "https://dancewithceech.com/images/ceech/ceech-teaching-private-student-neck-control.jpg", width: 1200, height: 630, alt: "Ceech teaching hip-hop dance" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Ceech | San Jose Dance Lessons | DanceWithCeech",
    description: "Contact Ceech about private hip-hop lessons, online dance training, or San Jose classes.",
    images: ["https://dancewithceech.com/images/ceech/ceech-teaching-private-student-neck-control.jpg"],
  },
};

const schema = businessSchema;

export default function ContactPage() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}>
      <script
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
              <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>Phone &amp; Text</div>
              <div className="flex flex-wrap items-center gap-3">
                <a href="tel:4086573771" className="text-lg font-medium hover:text-blue-400 transition-colors" style={{ color: "var(--foreground)" }}>
                  (408) 657-3771
                </a>
                <a
                  href="sms:4086573771"
                  className="inline-block text-sm px-4 py-2 rounded-full transition-colors hover:opacity-90"
                  style={{ backgroundColor: "var(--surface)", border: "1px solid #1f1f1f", color: "var(--accent-primary)" }}
                >
                  Text Ceech →
                </a>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>Studio</div>
              <a href="https://getdowndancestudios.com/" target="_blank" rel="noopener noreferrer" className="text-lg font-medium mb-1 hover:underline block" style={{ color: 'var(--foreground)' }}>Get Down Dance Studios</a>
              <p className="mb-3" style={{ color: "var(--muted)" }}>
                196 Jackson St<br />
                San Jose, CA 95112
              </p>
              <p className="mb-3 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                By appointment only, normally Saturdays between 9 a.m. and 5 p.m. Pacific Time. Other times may be available by special request.
              </p>
              <p className="mb-3 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                Paid street parking only. Check posted signs for fees and time limits, and allow time to park.
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
                src="https://www.google.com/maps?q=37.3488633,-121.8944247&output=embed"
                width="100%"
                height="220"
                style={{ border: 0, filter: "invert(90%) hue-rotate(180deg)" }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Get Down Dance Studios location"
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
          <ContactForm />

        </div>
      </section>

      <section id="community-college-classes" className="py-16 px-6 scroll-mt-24" style={{ borderTop: "1px solid #1f1f1f" }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-5">Community college dance classes</h2>
          <p className="leading-relaxed mb-6 max-w-3xl" style={{ color: "var(--muted)" }}>
            Ceech teaches hip-hop dance at Mission College, West Valley College, and Cabrillo College. These are college courses, separate from private lessons at the San Jose studio.
          </p>
          <ul className="grid sm:grid-cols-3 gap-4 mb-6">
            {["Mission College", "West Valley College", "Cabrillo College"].map((college) => (
              <li key={college} className="rounded-xl p-5 font-semibold" style={{ backgroundColor: "var(--surface)", border: "1px solid #1f1f1f" }}>{college}</li>
            ))}
          </ul>
          <p className="leading-relaxed max-w-3xl" style={{ color: "var(--muted)" }}>
            Register directly through the college, not through this contact form. Check your college&apos;s current class schedule for Ceech&apos;s hip-hop course and enrollment instructions. Schedules and fees vary by college and semester.
          </p>
        </div>
      </section>

      <Footer />

    </main>
  );
}
