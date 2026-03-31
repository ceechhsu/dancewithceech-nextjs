import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { notFound } from "next/navigation";
import { marked } from "marked";
import { getAllPosts, getPostBySlug, CATEGORY_LABELS } from "@/lib/posts";

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  const description = post.description ?? `Learn the ${post.title} dance move with step-by-step instruction from Ceech.`;
  const pageUrl = `https://dancewithceech.com/blog/${post.slug}`;
  const ogImage = `https://dancewithceech.com/images/posts/${post.slug}.jpg`;
  return {
    title: `${post.title} — DanceWithCeech`,
    description,
    openGraph: {
      title: post.title,
      description,
      url: pageUrl,
      type: "article",
      publishedTime: post.date,
      images: [{ url: ogImage, width: 1280, height: 720, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: [ogImage],
    },
    alternates: {
      canonical: pageUrl,
    },
  };
}

function readingTime(content: string): number {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

function extractFAQs(content: string): Array<{ question: string; answer: string }> {
  const faqSection = content.match(/## Frequently Asked Questions([\s\S]*?)(?=\n## |$)/);
  if (!faqSection) return [];
  const faqs: Array<{ question: string; answer: string }> = [];
  const qRegex = /### (.+?)\n([\s\S]*?)(?=\n### |\n## |$)/g;
  let match;
  while ((match = qRegex.exec(faqSection[1])) !== null) {
    faqs.push({ question: match[1].trim(), answer: match[2].trim().replace(/\n+/g, " ") });
  }
  return faqs;
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const mins = readingTime(post.content);
  const faqs = extractFAQs(post.content);
  const pageUrl = `https://dancewithceech.com/blog/${post.slug}`;
  const ogImage = `https://dancewithceech.com/images/posts/${post.slug}.jpg`;
  const description = post.description ?? `Learn the ${post.title} dance move with step-by-step instruction from Ceech.`;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description,
    image: ogImage,
    url: pageUrl,
    datePublished: post.date,
    author: { "@type": "Person", name: "Ceech", url: "https://dancewithceech.com" },
    publisher: { "@type": "Organization", name: "DanceWithCeech", url: "https://dancewithceech.com" },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Blog", item: "https://dancewithceech.com/blog" },
      { "@type": "ListItem", position: 2, name: CATEGORY_LABELS[post.category] ?? post.category, item: `https://dancewithceech.com/blog?category=${post.category}` },
      { "@type": "ListItem", position: 3, name: post.title, item: pageUrl },
    ],
  };

  const faqSchema = faqs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  } : null;

  const rawHtml = await marked.parse(post.content);

  // Convert YouTube links to embedded players (handles youtu.be, youtube.com/watch, youtube.com/shorts)
  const html = rawHtml.replace(
    /<a[^>]+href="(https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]+)[^"]*)"[^>]*>[^<]+<\/a>/g,
    (_match, _href, videoId) =>
      `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;margin:2rem 0;border-radius:12px;">` +
      `<iframe src="https://www.youtube.com/embed/${videoId}" title="YouTube video" frameborder="0" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen ` +
      `style="position:absolute;top:0;left:0;width:100%;height:100%;border-radius:12px;"></iframe></div>`
  );

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />}

      <Nav />

      <article className="pt-36 pb-24 px-6 max-w-2xl mx-auto">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs mb-10 uppercase tracking-widest" style={{ color: "var(--muted)" }}>
          <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
          <span style={{ color: "#333" }}>/</span>
          <Link href={`/blog?category=${post.category}`} className="hover:text-white transition-colors">
            {CATEGORY_LABELS[post.category] ?? post.category}
          </Link>
        </nav>

        {/* Category pill */}
        <div className="inline-flex items-center gap-2 mb-5">
          <span
            className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
            style={{ backgroundColor: "rgba(37,99,235,0.15)", color: "var(--accent-primary)", border: "1px solid rgba(37,99,235,0.3)" }}
          >
            {CATEGORY_LABELS[post.category] ?? post.category}
          </span>
        </div>

        {/* Title */}
        <h1
          className="font-black leading-none mb-6"
          style={{
            fontFamily: "var(--font-barlow-condensed), 'Arial Narrow', Arial, sans-serif",
            fontSize: "clamp(2.5rem, 6vw, 3.75rem)",
            textTransform: "uppercase",
            letterSpacing: "0.02em",
            color: "#FFFFFF",
          }}
        >
          {post.title}
        </h1>

        {/* Meta row — date + reading time */}
        <div className="flex items-center gap-4 text-sm mb-10" style={{ color: "var(--muted)" }}>
          <span>
            {new Date(post.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
          <span style={{ color: "#222" }}>|</span>
          <span>{mins} min read</span>
        </div>

        {/* Hero image */}
        <div className="mb-12 rounded-2xl overflow-hidden" style={{ aspectRatio: "16/9" }}>
          <img
            src={`/images/posts/${post.slug}.jpg`}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Content */}
        <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />

        {/* Decorative rule */}
        <div className="mt-16 mb-12" style={{ height: "1px", background: "linear-gradient(to right, #2563EB, transparent)" }} />

        {/* CTAs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Academy waitlist */}
          <div
            className="p-7 rounded-2xl flex flex-col"
            style={{ backgroundColor: "var(--surface)", border: "1px solid #1f1f1f" }}
          >
            <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--accent-primary)" }}>
              Online Academy
            </div>
            <p
              className="font-black uppercase leading-none mb-3"
              style={{
                fontFamily: "var(--font-barlow-condensed), 'Arial Narrow', Arial, sans-serif",
                fontSize: "1.5rem",
                letterSpacing: "0.03em",
              }}
            >
              Learn on your schedule.
            </p>
            <p className="text-sm mb-6 flex-1" style={{ color: "var(--muted)" }}>
              The DanceWithCeech academy is coming. Get early access before it opens.
            </p>
            <Link
              href="/academy"
              className="inline-block text-center px-6 py-3 rounded-full text-sm text-white font-semibold uppercase tracking-wider transition-opacity hover:opacity-80"
              style={{ backgroundColor: "var(--accent-primary)" }}
            >
              Join the Waitlist
            </Link>
          </div>

          {/* Private lessons */}
          <div
            className="p-7 rounded-2xl flex flex-col"
            style={{ backgroundColor: "var(--surface)", border: "1px solid #1f1f1f" }}
          >
            <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--accent-gold)" }}>
              Private Lessons
            </div>
            <p
              className="font-black uppercase leading-none mb-3"
              style={{
                fontFamily: "var(--font-barlow-condensed), 'Arial Narrow', Arial, sans-serif",
                fontSize: "1.5rem",
                letterSpacing: "0.03em",
              }}
            >
              Train 1-on-1 with Ceech.
            </p>
            <p className="text-sm mb-6 flex-1" style={{ color: "var(--muted)" }}>
              Get personalized coaching tailored to your style and goals.
            </p>
            <Link
              href="/private-lessons"
              className="inline-block text-center px-6 py-3 rounded-full text-sm font-semibold uppercase tracking-wider transition-opacity hover:opacity-80"
              style={{ backgroundColor: "var(--accent-gold)", color: "#000" }}
            >
              Book a Free Consult
            </Link>
          </div>

        </div>

      </article>

      <Footer />

    </main>
  );
}
