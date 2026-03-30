import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

export const metadata = {
  title: "Funk Style Dance Moves — DanceWithCeech",
  description: "Learn popping, waving, tutting and funk style dance moves. Step-by-step tutorials from instructor Ceech.",
};

export default function FunkStyleMovesPage() {
  const posts = getAllPosts().filter((p) => p.category === "funk-style-dance-moves");

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}>
      <Nav />

      <section className="pt-40 pb-12 px-6 text-center">
        <div className="text-sm font-medium tracking-widest uppercase mb-4" style={{ color: "var(--accent-primary)" }}>
          Dance Style
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Funk & Popping Dance Moves</h1>
        <p className="text-lg max-w-xl mx-auto" style={{ color: "var(--muted)" }}>
          Isolations, waves, hits, and electric pops. Funk style is where precision meets groove.
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

      <section className="py-16 px-6" style={{ borderTop: "1px solid #1f1f1f" }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center gap-6 rounded-2xl p-8" style={{ backgroundColor: "var(--surface)", border: "1px solid #1f1f1f" }}>
          <div className="flex-1">
            <div className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: "#FDB515" }}>
              Free 30-Day Program
            </div>
            <h2 className="text-xl font-bold mb-2">FTL Popping Training Series Volume 1</h2>
            <p style={{ color: "var(--muted)" }} className="text-sm">
              A beginner popping program built around daily drills. 30 days. No excuses.
            </p>
          </div>
          <Link
            href="/ftl-popping-training-series-volume-1"
            className="flex-shrink-0 inline-block px-6 py-3 rounded-full text-white font-semibold hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "var(--accent-primary)" }}
          >
            Start the program →
          </Link>
        </div>
      </section>

      <section className="py-16 px-6 text-center" style={{ backgroundColor: "var(--surface)", borderTop: "1px solid #1f1f1f" }}>
        <h2 className="text-2xl font-bold mb-4">Train your rhythm before your feet.</h2>
        <p className="mb-8" style={{ color: "var(--muted)" }}>Funk style lives in the pocket of the beat. Build that foundation first.</p>
        <Link href="/beat-first" className="inline-block px-8 py-4 rounded-full text-white font-semibold hover:opacity-90 transition-opacity" style={{ backgroundColor: "var(--accent-primary)" }}>
          Play BeatFirst — Free
        </Link>
      </section>

      <Footer />
    </main>
  );
}
