import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

export const metadata = {
  title: "Hip-Hop Dance Moves — DanceWithCeech",
  description: "Learn hip-hop dance moves step by step. Tutorials for all levels from instructor Ceech.",
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

      <section className="py-16 px-6 text-center" style={{ backgroundColor: "var(--surface)", borderTop: "1px solid #1f1f1f" }}>
        <h2 className="text-2xl font-bold mb-4">Train your rhythm before your feet.</h2>
        <p className="mb-8" style={{ color: "var(--muted)" }}>Every hip-hop move starts with timing. Build that foundation first.</p>
        <Link href="/beat-first" className="inline-block px-8 py-4 rounded-full text-white font-semibold hover:opacity-90 transition-opacity" style={{ backgroundColor: "var(--accent-primary)" }}>
          Play BeatFirst — Free
        </Link>
      </section>

      <Footer />
    </main>
  );
}
