import Link from "next/link";
import Image from "next/image";
import Nav from "@/components/Nav";
import ScrollyHero from "@/components/ScrollyHero";
import StatsBar from "@/components/StatsBar";
import DeferredHomeTestimonials from "@/components/DeferredHomeTestimonials";
import RunningManCampaignBanner from "@/components/RunningManCampaignBanner";
import { businessSchema } from "@/lib/private-lesson-details";
import { CATEGORY_LABELS, CATEGORY_PATHS, getFeaturedTutorialsByCategory } from "@/lib/posts";
import { getReviewSummary } from "@/lib/reviews";

const organizationSchema = businessSchema;

export const metadata = {
  title: "DanceWithCeech: Hip-Hop Dance Lessons with Ceech",
  description: "Learn hip-hop, locking, popping, and house dance with Ceech through beginner-friendly online training and private lessons in San Jose.",
  alternates: { canonical: "https://dancewithceech.com" },
  openGraph: {
    title: "DanceWithCeech: Hip-Hop Dance Lessons with Ceech",
    description: "Learn hip-hop, locking, popping, and house dance from Ceech. America's Got Talent performer, Body Rock champion, and Bay Area dance instructor.",
    url: "https://dancewithceech.com",
    siteName: "Dance With Ceech",
    images: [{ url: "https://dancewithceech.com/images/ceech/ceech-teaching-private-student-neck-control.jpg", width: 1200, height: 630, alt: "Ceech teaching hip-hop dance" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DanceWithCeech: Hip-Hop Dance Lessons with Ceech",
    description: "Learn hip-hop, locking, popping, and house dance from Ceech. America's Got Talent performer, Body Rock champion, and Bay Area dance instructor.",
    images: ["https://dancewithceech.com/images/ceech/ceech-teaching-private-student-neck-control.jpg"],
  },
};

export default async function Home() {
  const featuredTutorialGroups = Object.entries(getFeaturedTutorialsByCategory()).filter(
    ([, posts]) => posts.length > 0
  );
  const reviewSummary = await getReviewSummary();

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />

      <Nav />

      <ScrollyHero />

      {/* SOCIAL PROOF BAR */}
      <StatsBar />

      {/* TEMPORARY FOUNDING-COHORT CAMPAIGN */}
      <RunningManCampaignBanner />

      {/* CREDIBILITY */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-xs font-bold uppercase tracking-widest text-center mb-8" style={{ color: "var(--muted)" }}>
            Ceech&apos;s Story
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1f1f1f" }}>
              <Image
                src="/images/ceech/dsplayers-performing-americas-got-talent.jpg"
                alt="DS Players on America's Got Talent 2010"
                title="DS Players performing on America's Got Talent in 2010"
                width={600}
                height={380}
                sizes="(min-width: 640px) 33vw, 100vw"
                className="w-full object-cover"
                style={{ height: "200px" }}
              />
              <div className="px-4 py-3" style={{ backgroundColor: "var(--surface)" }}>
                <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--accent-gold)" }}>America&apos;s Got Talent</div>
                <div className="text-sm font-semibold">DS Players: Season 5 (2010)</div>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1f1f1f" }}>
              <Image
                src="/images/ceech/mindtricks-dance-group-photo.jpg"
                alt="Mindtricks: original Jabbawockeez founders"
                title="Mindtricks dance group with future Jabbawockeez founders"
                width={600}
                height={380}
                sizes="(min-width: 640px) 33vw, 100vw"
                className="w-full object-cover"
                style={{ height: "200px", objectPosition: "center 20%" }}
              />
              <div className="px-4 py-3" style={{ backgroundColor: "var(--surface)" }}>
                <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--accent-gold)" }}>Crew with Future Jabbawockeez Members</div>
                <div className="text-sm font-semibold">Mindtricks: Bay Area dance crew</div>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1f1f1f" }}>
              <Image
                src="/images/ceech/dsplayers-2006-body-rock-winners.jpg"
                alt="DS Players Body Rock 2007 Champions"
                title="DS Players Body Rock dance competition winners"
                width={600}
                height={380}
                sizes="(min-width: 640px) 33vw, 100vw"
                className="w-full object-cover"
                style={{ height: "200px" }}
              />
              <div className="px-4 py-3" style={{ backgroundColor: "var(--surface)" }}>
                <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--accent-gold)" }}>Body Rock 2007: 1st Place</div>
                <div className="text-sm font-semibold">International Hip-Hop Dance Championship</div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm" style={{ color: "var(--muted)" }}>
            <span>Also taught at</span>
            <strong style={{ color: "var(--foreground)" }}>Google</strong>
            <span>College teaching at Mission, West Valley, Gavilan, and Cabrillo</span>
            <span>Guest taught at Stanford, UC Berkeley &amp; more</span>
          </div>
        </div>
      </section>

      {/* BEATFIRST TEASER */}
      <section className="py-24 px-6" style={{ backgroundColor: "var(--surface)" }}>
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-sm font-medium tracking-widest uppercase mb-4" style={{ color: "var(--accent-primary-accessible)" }}>
            BeatFirst Rhythm Trainer
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            The first skill every dancer<br />needs, and most skip.
          </h2>
          <p className="text-lg mb-10 max-w-xl mx-auto leading-relaxed" style={{ color: "var(--muted)" }}>
            Tap to the beat, earn your rhythm score, and access real dance move tutorials. Free. No account needed.
          </p>
          <Link href="/beat-first" className="inline-block px-8 py-4 rounded-full text-white font-semibold transition-opacity hover:opacity-90" style={{ backgroundColor: "var(--accent-primary)" }}>
            Play BeatFirst Free
          </Link>
        </div>
      </section>

      {/* FEATURED TUTORIAL LINKS */}
      <section className="py-20 px-6" style={{ backgroundColor: "var(--surface)", borderTop: "1px solid #1f1f1f" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-sm font-medium tracking-widest uppercase mb-4" style={{ color: "var(--accent-primary-accessible)" }}>
              Start Learning
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Start with these dance tutorials</h2>
            <p className="max-w-2xl mx-auto" style={{ color: "var(--muted)" }}>
              Core tutorials from each style, collected here so you can start with the fundamentals.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {featuredTutorialGroups.map(([category, posts]) => (
              <div key={category} className="rounded-2xl p-5" style={{ backgroundColor: "var(--background)", border: "1px solid #1f1f1f" }}>
                <Link
                  href={CATEGORY_PATHS[category] ?? "/blog"}
                  prefetch={false}
                  className="block text-sm font-bold uppercase tracking-widest mb-4 hover:text-blue-400 transition-colors"
                  style={{ color: "var(--accent-primary-accessible)" }}
                >
                  {CATEGORY_LABELS[category] ?? category}
                </Link>
                <div className="flex flex-col gap-3">
                  {posts.map((post) => (
                    <Link
                      key={post.slug}
                      href={`/blog/${post.slug}`}
                      prefetch={false}
                      className="text-sm leading-snug hover:text-white transition-colors"
                      style={{ color: "var(--muted)" }}
                    >
                      {post.title}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <DeferredHomeTestimonials
        summary={reviewSummary}
        items={[
          { videoId: "PppnU3oHvlQ" },
          { videoId: "J4_XpORtTfQ" },
          { videoId: "bdSEa_S85-c" },
          { videoId: "I68OCXhkaEo" },
          { videoId: "0DKQ1PPW7Ag" },
          { videoId: "CgB1N_nx5vo" },
          { videoId: "h32DyBzyi4Q" },
        ]}
      />

      {/* PRIVATE LESSONS CTA */}
      <section className="py-24 px-6" style={{ backgroundColor: "var(--surface)" }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Want direct feedback from Ceech?
          </h2>
          <p className="text-lg mb-10 leading-relaxed" style={{ color: "var(--muted)" }}>
            Private 1-on-1 Google Meet lessons. Real-time corrections. Personalized to exactly where you are.
          </p>
          <Link href="/private-lessons" className="inline-block px-8 py-4 rounded-full text-white font-semibold transition-opacity hover:opacity-90" style={{ backgroundColor: "var(--accent-primary)" }}>
            Book a Private Lesson
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 px-6" style={{ borderTop: "1px solid #1f1f1f" }}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between gap-8">
          <div>
            <div className="font-bold text-lg mb-2">Dance With Ceech</div>
            <p className="text-sm max-w-xs leading-relaxed" style={{ color: "var(--muted)" }}>
              Rhythm first. Then dance. Hip-hop dance education for analytical minds.
            </p>
          </div>
          <div className="flex flex-wrap gap-12">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>Learn</div>
              <div className="flex flex-col gap-2 text-sm" style={{ color: "var(--muted)" }}>
                <Link href="/beat-first" prefetch={false} className="hover:text-white transition-colors">BeatFirst</Link>
                <Link href="/private-lessons" prefetch={false} className="hover:text-white transition-colors">Private Lessons</Link>
                <Link href="/private-lessons/san-jose" prefetch={false} className="hover:text-white transition-colors">San Jose Lessons</Link>
                <Link href="/private-lessons/bay-area" prefetch={false} className="hover:text-white transition-colors">Bay Area Lessons</Link>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>Styles</div>
              <div className="flex flex-col gap-2 text-sm" style={{ color: "var(--muted)" }}>
                <Link href="/hip-hop-dance-moves" prefetch={false} className="hover:text-white transition-colors">Hip-Hop</Link>
                <Link href="/locking-dance-moves" prefetch={false} className="hover:text-white transition-colors">Locking</Link>
                <Link href="/funk-style-dance-moves" prefetch={false} className="hover:text-white transition-colors">Funk & Popping</Link>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>Connect</div>
              <div className="flex flex-col gap-2 text-sm" style={{ color: "var(--muted)" }}>
                <Link href="/blog" prefetch={false} className="hover:text-white transition-colors">Blog</Link>
                <Link href="/about" prefetch={false} className="hover:text-white transition-colors">About</Link>
                <Link href="/contact" prefetch={false} className="hover:text-white transition-colors">Contact</Link>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-5xl mx-auto mt-8 pt-8 text-xs text-center" style={{ borderTop: "1px solid #1f1f1f", color: "var(--muted)" }}>
          © {new Date().getFullYear()} Dance With Ceech. All rights reserved.
        </div>
      </footer>

    </main>
  );
}
