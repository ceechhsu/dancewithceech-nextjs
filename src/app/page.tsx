import approvedStyles from "@/components/approved-pages/PageScope.module.css";
import Image from "next/image";
import Link from "next/link";
import Nav from "@/components/approved-pages/Nav";
import Footer from "@/components/approved-pages/Footer";
import VideoHero from "@/components/approved-pages/VideoHero";
import StatsBar from "@/components/StatsBar";
import HomePrivateCoaching from "@/components/approved-pages/HomePrivateCoaching";
import HomeTutorials from "@/components/approved-pages/HomeTutorials";
import HomeBeatFirstDemo from "@/components/HomeBeatFirstDemo";
import HomeSocialLinks from "@/components/approved-pages/HomeSocialLinks";
import DeferredHomeTestimonials from "@/components/approved-pages/DeferredHomeTestimonials";
import { homepageFaqs, homepageSchema } from "@/lib/approved-pages/homepage-details";
import { getReviewSummary } from "@/lib/reviews";

export const metadata = {
  title: "Online Hip-Hop Dance Lessons for Adults | Dance With Ceech",
  description: "Hip-hop dance lessons for adults: learn online or in person in San Jose, explore free tutorials, and practice rhythm with BeatFirst.",
  alternates: { canonical: "https://dancewithceech.com" },
  openGraph: { title: "Hip-Hop Dance Lessons for Adults | Dance With Ceech", description: "Recorded feedback on your dancing, then practice corrections with Ceech. Adults 18+, worldwide. In-person lessons also available in San Jose.", url: "https://dancewithceech.com", siteName: "Dance With Ceech", type: "website", images: [{ url: "https://dancewithceech.com/images/ceech/ceech-teaching-private-student-neck-control.jpg", width: 1200, height: 630, alt: "Ceech teaching a private dance lesson" }] },
  twitter: { card: "summary_large_image", title: "Hip-Hop Dance Lessons for Adults | Dance With Ceech", description: "Personal feedback and a clear next step for adult dancers.", images: ["https://dancewithceech.com/images/ceech/ceech-teaching-private-student-neck-control.jpg"] },
};

export default async function Home() {
  const reviewSummary = await getReviewSummary();
  return <div className={approvedStyles.scope}><a href="#main-content" className={approvedStyles.skipLink}>Skip to content</a><Nav /><main id="main-content">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homepageSchema).replace(/</g, "\\u003c") }} />
    <VideoHero />
    <StatsBar />
    <HomePrivateCoaching uniformHeading />
      {/* CREDIBILITY */}
      <section id="teaching-story" aria-labelledby="teaching-story-heading" className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 id="teaching-story-heading" className="home-section-heading mb-8">
            Meet Ceech
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1f1f1f" }}>
              <Image unoptimized
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
              <Image unoptimized
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
              <Image unoptimized
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
        </div>
      </section>

      {/* BEATFIRST TEASER */}
      <section id="rhythm-trainer" className="py-16 px-6 scroll-mt-20" style={{ backgroundColor: "var(--surface)" }}>
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-6 sm:gap-8">
          <div className="w-full text-center">
            <h2 className="home-section-heading">BeatFirst Rhythm Trainer</h2>
            <p className="mt-3 text-lg font-semibold text-amber-300 sm:text-xl">Can you hit all 15 beats?</p>
            <p className="home-section-tagline mt-3">Tap to the beat. See if you’re early, late, or right on time.</p>
          </div>
          <div className="w-full max-w-[440px]">
            <HomeBeatFirstDemo />
            <div className="mt-4 flex justify-center">
              <Link href="/beat-first" prefetch={false} className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/25 px-5 py-2.5 text-sm font-medium text-muted transition-colors hover:border-accent-primary-accessible hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-primary-accessible">
                Explore all BeatFirst levels
              </Link>
            </div>
          </div>
        </div>
      </section>

    <HomeTutorials />
    <DeferredHomeTestimonials uniformHeadings summary={reviewSummary} items={[{ videoId: "PppnU3oHvlQ" }, { videoId: "J4_XpORtTfQ" }, { videoId: "bdSEa_S85-c" }, { videoId: "I68OCXhkaEo" }, { videoId: "0DKQ1PPW7Ag" }, { videoId: "CgB1N_nx5vo" }, { videoId: "h32DyBzyi4Q" }]} />
    <section id="faq" className="funnel-section"><div className="funnel-wrap max-w-3xl"><h2 className="funnel-heading mb-8">Getting started with Dance With Ceech</h2>{homepageFaqs.map(faq => <details key={faq.question} className="border-b border-white/15 py-5"><summary className="cursor-pointer text-lg font-semibold">{faq.question}</summary><p className="mt-4 leading-relaxed text-muted">{faq.answer}</p></details>)}<p className="mt-6 text-sm text-muted">Compare <Link href="/private-lessons" prefetch={false} className="funnel-link">online and in-person lessons</Link>, or read the <Link href="/private-lessons#faq" prefetch={false} className="funnel-link">lesson FAQs</Link>.</p></div></section>
    <section className="funnel-section bg-surface text-center"><div className="funnel-wrap max-w-3xl"><h2 className="funnel-heading">Want direct feedback from Ceech?</h2><p className="funnel-copy mx-auto mb-8">Choose online lessons or meet in person in San Jose. Start with a free 30-minute phone consultation about your goals.</p><Link href="/private-lessons#booking" prefetch={false} className="funnel-button">Book a free 30-minute phone consultation</Link></div></section>
    <HomeSocialLinks />
  </main><Footer /></div>;
}
