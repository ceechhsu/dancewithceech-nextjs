import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { getAllPosts, CATEGORY_LABELS } from "@/lib/posts";

export const metadata = {
  title: "Blog — DanceWithCeech",
  description: "Hip-hop dance tutorials, move breakdowns, and tips from Ceech.",
};

const CATEGORIES = [
  "all",
  "hip-hop-dance-moves",
  "locking-dance-moves",
  "breaking-dance-moves",
  "funk-style-dance-moves",
  "house-dance",
  "general",
];

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const activeCategory = category ?? "all";
  const allPosts = getAllPosts();
  const posts =
    activeCategory === "all"
      ? allPosts
      : allPosts.filter((p) => p.category === activeCategory);

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}>

      <Nav />

      {/* HEADER */}
      <section className="pt-40 pb-12 px-6 text-center">
        <div className="text-sm font-medium tracking-widest uppercase mb-4" style={{ color: "var(--accent-primary)" }}>
          The Blog
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Dance Move Library</h1>
        <p className="text-lg max-w-xl mx-auto" style={{ color: "var(--muted)" }}>
          Breakdowns, tutorials, and tips across every hip-hop dance style.
        </p>
      </section>

      {/* CATEGORY FILTER */}
      <section className="px-6 pb-12">
        <div className="max-w-5xl mx-auto flex flex-wrap gap-2 justify-center">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat}
              href={cat === "all" ? "/blog" : `/blog?category=${cat}`}
              className="px-4 py-2 rounded-full text-sm font-medium transition-colors"
              style={{
                backgroundColor: activeCategory === cat ? "var(--accent-primary)" : "var(--surface)",
                color: activeCategory === cat ? "#fff" : "var(--muted)",
                border: "1px solid #1f1f1f",
              }}
            >
              {cat === "all" ? "All" : CATEGORY_LABELS[cat] ?? cat}
            </Link>
          ))}
        </div>
      </section>

      {/* POSTS GRID */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group rounded-2xl overflow-hidden flex flex-col transition-colors hover:border-blue-600"
              style={{ backgroundColor: "var(--surface)", border: "1px solid #1f1f1f" }}
            >
              <div className="overflow-hidden" style={{ aspectRatio: "16/9" }}>
                <img
                  src={`/images/posts/${post.slug}.jpg`}
                  alt={post.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-6 flex flex-col gap-3 flex-1">
                <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--accent-primary)" }}>
                  {CATEGORY_LABELS[post.category] ?? post.category}
                </div>
                <h2 className="font-bold text-lg leading-snug group-hover:text-blue-400 transition-colors">
                  {post.title}
                </h2>
                <div className="text-xs mt-auto" style={{ color: "var(--muted)" }}>
                  {new Date(post.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {posts.length === 0 && (
          <div className="text-center py-24" style={{ color: "var(--muted)" }}>
            No posts in this category yet.
          </div>
        )}
      </section>

      <Footer />

    </main>
  );
}
