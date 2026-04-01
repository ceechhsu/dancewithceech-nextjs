import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

export const metadata = {
  title: "Hip-Hop Dance Moves — DanceWithCeech",
  description: "Learn hip-hop dance moves step by step. Tutorials for all levels from instructor Ceech.",
  keywords: ["hip-hop dance moves", "hip hop dance tutorials", "learn hip hop", "street dance", "hip hop choreography", "hip hop dance for beginners"],
  openGraph: {
    title: "Hip-Hop Dance Moves — DanceWithCeech",
    description: "Learn hip-hop dance moves step by step. Tutorials for all levels from instructor Ceech.",
    url: "https://dancewithceech.com/hip-hop-dance-moves",
    siteName: "DanceWithCeech",
    images: [{ url: "https://dancewithceech.com/images/styles/hip-hop.jpg", width: 1200, height: 630, alt: "Hip-Hop Dance Moves" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hip-Hop Dance Moves — DanceWithCeech",
    description: "Learn hip-hop dance moves step by step. Tutorials for all levels from instructor Ceech.",
    images: ["https://dancewithceech.com/images/styles/hip-hop.jpg"],
  },
};

export default function HipHopMovesPage() {
  const posts = getAllPosts().filter((p) => p.category === "hip-hop-dance-moves");

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}>
      <Nav />

      <section className="pt-40 pb-12 px-6 text-center">
        <div className="text-sm font-medium tracking-widest uppercase mb-4" style={{ color: "var(--accent-primary)" }}>
          Dance Style
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Hip-Hop Dance Moves</h1>
        <p className="text-lg max-w-xl mx-auto" style={{ color: "var(--muted)" }}>
          The foundation of street dance. Learn the grooves, steps, and footwork that define hip-hop movement.
        </p>
      </section>

      <section className="pb-24 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group rounded-2xl p-6 flex flex-col gap-3 transition-colors hover:border-blue-600"
              style={{ backgroundColor: "var(--surface)", border: "1px solid #1f1f1f" }}
            >
              <h2 className="font-bold text-lg leading-snug group-hover:text-blue-400 transition-colors">
                {post.title}
              </h2>
              <div className="text-xs mt-auto" style={{ color: "var(--muted)" }}>
                {new Date(post.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
              </div>
            </Link>
          ))}
          {posts.length === 0 && (
            <div className="col-span-3 text-center py-24" style={{ color: "var(--muted)" }}>
              Posts coming soon.
            </div>
          )}
        </div>
      </section>

      <section className="py-20 px-6" style={{ borderTop: "1px solid #1f1f1f" }}>
        <div className="max-w-5xl mx-auto text-center mb-12">
          <h2 className="text-2xl font-bold mb-3">Ready to go deeper?</h2>
          <p style={{ color: "var(--muted)" }}>Three ways to keep moving — pick what fits where you are right now.</p>
        </div>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl p-8 flex flex-col gap-4" style={{ backgroundColor: "var(--surface)", border: "1px solid #1f1f1f" }}>
            <div className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--accent-primary)" }}>Free</div>
            <h3 className="text-lg font-bold">Train Your Rhythm</h3>
            <p className="text-sm flex-1" style={{ color: "var(--muted)" }}>Every hip-hop move starts with timing. BeatFirst builds that foundation — free, no sign-up required.</p>
            <Link href="/beat-first" className="inline-block text-center px-6 py-3 rounded-full font-semibold text-white hover:opacity-90 transition-opacity" style={{ backgroundColor: "var(--accent-primary)" }}>
              Play BeatFirst — Free
            </Link>
          </div>
          <div className="rounded-2xl p-8 flex flex-col gap-4" style={{ backgroundColor: "var(--surface)", border: "1px solid #2563eb44" }}>
            <div className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--accent-primary)" }}>Academy</div>
            <h3 className="text-lg font-bold">Full Curriculum</h3>
            <p className="text-sm flex-1" style={{ color: "var(--muted)" }}>A structured path from zero to freestyle. Video lessons, private community, and live sessions with Ceech.</p>
            <Link href="/academy" className="inline-block text-center px-6 py-3 rounded-full font-semibold text-white hover:opacity-90 transition-opacity" style={{ backgroundColor: "var(--accent-primary)" }}>
              Join the Academy
            </Link>
          </div>
          <div className="rounded-2xl p-8 flex flex-col gap-4" style={{ backgroundColor: "var(--surface)", border: "1px solid #1f1f1f" }}>
            <div className="text-xs font-bold uppercase tracking-widest" style={{ color: "#FDB515" }}>Private Lessons</div>
            <h3 className="text-lg font-bold">1-on-1 with Ceech</h3>
            <p className="text-sm flex-1" style={{ color: "var(--muted)" }}>Want faster results? Book a private lesson — in-person in San Jose or virtually via Zoom.</p>
            <Link href="/private-lessons" className="inline-block text-center px-6 py-3 rounded-full font-semibold hover:opacity-90 transition-opacity" style={{ border: "1px solid #FDB515", color: "#FDB515" }}>
              Book a Lesson
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
