import Link from "next/link";
import Image from "next/image";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { notFound } from "next/navigation";
import { marked } from "marked";
import { CATEGORY_LABELS, CATEGORY_PATHS, getAllPosts, getPostBySlug, getRelatedPosts } from "@/lib/posts";
import { addResponsiveTableLabels } from "@/lib/markdown";

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
    title: post.seoTitle ?? `${post.title} — DanceWithCeech`,
    description,
    openGraph: {
      title: post.title,
      description,
      url: pageUrl,
      type: "article",
      publishedTime: post.date,
      modifiedTime: post.updated,
      images: [{ url: ogImage, width: 1280, height: 720, alt: post.imageAlt ?? post.title }],
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

function displayDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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
  const relatedPosts = getRelatedPosts(post);
  const categoryPath = CATEGORY_PATHS[post.category] ?? "/blog";
  const categoryUrl = `https://dancewithceech.com${categoryPath}`;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description,
    image: ogImage,
    url: pageUrl,
    datePublished: post.date,
    ...(post.updated ? { dateModified: post.updated } : {}),
    mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
    author: { "@type": "Person", name: "Ceech", url: "https://dancewithceech.com/about" },
    publisher: { "@type": "Organization", name: "DanceWithCeech", url: "https://dancewithceech.com" },
  };

  const videoSchema = post.video ? {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: post.video.name,
    description: post.video.description,
    thumbnailUrl: post.video.thumbnailUrl,
    uploadDate: post.video.uploadDate,
    duration: post.video.duration,
    embedUrl: post.video.embedUrl,
  } : null;

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Blog", item: "https://dancewithceech.com/blog" },
      { "@type": "ListItem", position: 2, name: CATEGORY_LABELS[post.category] ?? post.category, item: categoryUrl },
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
  const html = addResponsiveTableLabels(rawHtml.replace(
    /<a[^>]+href="(https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]+)[^"]*)"[^>]*>[^<]+<\/a>/g,
    (_match, _href, videoId) =>
      `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;margin:2rem 0;border-radius:12px;">` +
      `<iframe loading="lazy" src="https://www.youtube.com/embed/${videoId}" title="${post.video?.playerTitle ?? "YouTube video"}" frameborder="0" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen ` +
      `style="position:absolute;top:0;left:0;width:100%;height:100%;border-radius:12px;"></iframe></div>`
  ));

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />}
      {videoSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(videoSchema) }} />}

      <Nav />

      <article className="pt-36 pb-24 px-6 max-w-2xl mx-auto">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs mb-10 uppercase tracking-widest" style={{ color: "var(--muted)" }}>
          <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
          <span style={{ color: "#333" }}>/</span>
          <Link href={categoryPath} className="hover:text-white transition-colors">
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

        {/* Meta row — author, dates, and reading time */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm mb-10" style={{ color: "var(--muted)" }}>
          <Link href="/about" className="hover:text-white transition-colors">By Ceech</Link>
          <span>Published {displayDate(post.date)}</span>
          {post.updated && <span>Updated {displayDate(post.updated)}</span>}
          <span>{mins} min read</span>
        </div>

        {/* Hero image */}
        {post.hasImage && (
          <div className="relative mb-12 rounded-2xl overflow-hidden" style={{ aspectRatio: "16/9" }}>
            <Image
              src={`/images/posts/${post.slug}.jpg`}
              alt={post.imageAlt ?? post.title}
              title={post.imageAlt ?? post.title}
              fill
              sizes="(max-width: 672px) calc(100vw - 3rem), 672px"
              priority
              className="object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />

        {relatedPosts.length > 0 && (
          <section className="mt-14 p-6 rounded-2xl" style={{ backgroundColor: "var(--surface)", border: "1px solid #1f1f1f" }}>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--accent-primary)" }}>
                  Keep Learning
                </div>
                <h2 className="text-xl font-bold">
                  More {CATEGORY_LABELS[post.category] ?? "dance"} tutorials
                </h2>
              </div>
              <Link
                href={categoryPath}
                className="text-sm font-semibold hover:text-white transition-colors"
                style={{ color: "var(--muted)" }}
              >
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {relatedPosts.map((relatedPost) => (
                <Link
                  key={relatedPost.slug}
                  href={`/blog/${relatedPost.slug}`}
                  className="block rounded-xl px-4 py-3 text-sm font-semibold transition-colors hover:border-blue-600"
                  style={{ color: "var(--foreground)", backgroundColor: "var(--background)", border: "1px solid #1f1f1f" }}
                >
                  {relatedPost.title}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Decorative rule */}
        <div className="mt-16 mb-12" style={{ height: "1px", background: "linear-gradient(to right, #2563EB, transparent)" }} />

        {/* CTAs */}
        <div className="grid grid-cols-1 gap-4">
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
