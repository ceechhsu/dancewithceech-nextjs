import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

export const metadata = {
  title: "Breaking Dance Moves — DanceWithCeech",
  description: "Learn breaking dance moves step by step. Footwork, power moves, and freezes taught by instructor Ceech.",
  keywords: ["breaking dance moves", "breakdancing tutorials", "footwork", "power moves", "freezes", "bboy", "bgirl", "learn breaking"],
  openGraph: {
    title: "Breaking Dance Moves — DanceWithCeech",
    description: "Learn breaking dance moves step by step. Footwork, power moves, and freezes taught by instructor Ceech.",
    url: "https://dancewithceech.com/breaking-dance-moves",
    siteName: "DanceWithCeech",
    images: [{ url: "https://dancewithceech.com/images/styles/breaking.jpg", width: 1200, height: 630, alt: "Breaking Dance Moves" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Breaking Dance Moves — DanceWithCeech",
    description: "Learn breaking dance moves step by step. Footwork, power moves, and freezes taught by instructor Ceech.",
    images: ["https://dancewithceech.com/images/styles/breaking.jpg"],
  },
};

export default function BreakingMovesPage() {
  const posts = getAllPosts().filter((p) => p.category === "breaking-dance-moves");

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}>
      <Nav />

      <section className="pt-40 pb-12 px-6 text-center">
        <div className="text-sm font-medium tracking-widest uppercase mb-4" style={{ color: "var(--accent-primary)" }}>
          Dance Style
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Breaking Dance Moves</h1>
        <p className="text-lg max-w-xl mx-auto" style={{ color: "var(--muted)" }}>
          Footwork, power moves, freezes, and style. Breaking is the athletic heart of hip-hop culture.
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
        <p className="mb-8" style={{ color: "var(--muted)" }}>Breaking demands precision timing. Build that foundation first.</p>
        <Link href="/beat-first" className="inline-block px-8 py-4 rounded-full text-white font-semibold hover:opacity-90 transition-opacity" style={{ backgroundColor: "var(--accent-primary)" }}>
          Play BeatFirst — Free
        </Link>
      </section>

      <Footer />
    </main>
  );
}
