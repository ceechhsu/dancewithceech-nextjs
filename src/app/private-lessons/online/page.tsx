import approvedStyles from "@/components/approved-pages/PageScope.module.css";
import Image from "next/image";
import teacherStyles from "@/components/approved-pages/home-teacher.module.css";
import Link from "next/link";
import Nav from "@/components/approved-pages/Nav";
import Footer from "@/components/approved-pages/Footer";
import HomeSocialLinks from "@/components/approved-pages/HomeSocialLinks";
import OnlinePricing from "./OnlinePricing";
import { OnlineCoachingCycle } from "@/components/approved-pages/CoachingDirections";
import { businessSchema, instructorSchema } from "@/lib/private-lesson-details";

export const metadata = {
  title: "Online Private Dance Lessons for Adults | Dance With Ceech",
  description: "Personal online hip-hop lessons for adults: submit your video, receive recorded feedback within three business days, then practice corrections in a 30-minute Google Meet.",
  alternates: { canonical: "https://dancewithceech.com/private-lessons/online" },
  openGraph: { title: "Online Private Dance Lessons for Adults | Dance With Ceech", description: "Personal video feedback, clear corrections and a 30-minute Google Meet. One-time coaching cycles for adults worldwide.", url: "https://dancewithceech.com/private-lessons/online", siteName: "Dance With Ceech", type: "website", images: [{ url: "https://dancewithceech.com/images/ceech/ceech-teaching-neck-o-flex.webp", width: 1280, height: 720, alt: "Ceech guiding a student during a dance lesson" }] },
  twitter: { card: "summary_large_image", title: "Online Private Dance Lessons for Adults | Dance With Ceech", description: "Personal video feedback, clear corrections and practice tailored to you.", images: ["https://dancewithceech.com/images/ceech/ceech-teaching-neck-o-flex.webp"] },
};

const onlineSchema = {
  "@context": "https://schema.org",
  "@graph": [businessSchema, instructorSchema, {
    "@type": "Service", "@id": "https://dancewithceech.com/private-lessons/online#service",
    name: "Online private dance lessons for adults", url: "https://dancewithceech.com/private-lessons/online",
    provider: { "@id": businessSchema["@id"] }, serviceType: "Online private dance instruction",
    areaServed: "Worldwide online", audience: { "@type": "Audience", audienceType: "Adults 18 and older" },
  }],
};

export default function OnlinePrivateLessonsPage() {
  return <div className={approvedStyles.scope}><a href="#main-content" className={approvedStyles.skipLink}>Skip to content</a>
    <Nav />
    <main id="main-content">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(onlineSchema).replace(/</g, "\\u003c") }} />
      <section className="funnel-section" style={{ paddingTop: 144 }}>
        <div className="funnel-wrap max-w-4xl">
          <Link href="/private-lessons" prefetch={false} className="funnel-link text-sm">← Compare online and in-person lessons</Link>
          <p className="funnel-eyebrow mt-8">Personal feedback · Adults 18+ · Worldwide</p>
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight text-balance">Online Private Dance Lessons for Adults</h1>
          <p className="funnel-copy mt-6">Personalized video feedback. Clear corrections. Practice tailored to you.</p>
          <p className="funnel-copy mt-4">Submit your dance video, receive recorded feedback within three business days, then work through the corrections with Ceech in a 30-minute Google Meet.</p>
          <Link href="/private-lessons#booking" data-coaching-offer="online_coaching" prefetch={false} className="funnel-button mt-8">Book a free 30-minute phone consultation</Link>
        </div>
      </section>
      <div id="private-coaching"><OnlineCoachingCycle /></div>
      <div id="pricing"><OnlinePricing /></div>
      <section id="learn-with-a-teacher" aria-labelledby="teacher-heading" className={`border-t border-white/10 bg-surface ${teacherStyles.section}`}>
        <div className={teacherStyles.portraitGrid}>
          <div className={teacherStyles.portraitTitle}><p className="funnel-eyebrow">Learn with a teacher.</p><h2 id="teacher-heading" className={teacherStyles.teacherHeading}>Feedback you can put into practice.</h2></div>
          <figure className={teacherStyles.portraitFrame}><Image src="/images/ceech/ceech-teaching-neck-o-flex.webp" unoptimized alt="Ceech guiding a student’s head position during a Neck-O-Flex dance lesson" fill sizes="(min-width: 1024px) 380px, (min-width: 768px) 40vw, 360px" /></figure>
          <div className={teacherStyles.portraitBody}><p className={teacherStyles.copy}>I review your video, explain what to adjust, and give you practice tailored to your rhythm, balance and coordination. You’ll know what to work on and why.</p><p className={`${teacherStyles.copy} mt-4`}>Ceech has taught dance since 1998 and at Mission College since 2002.</p><Link href="/about" prefetch={false} className={`funnel-link ${teacherStyles.aboutLink}`}>Meet Ceech and read his teaching story <span aria-hidden="true">→</span></Link></div>
        </div>
      </section>
      <section aria-labelledby="in-person-heading" className="py-16 px-6 border-y border-white/10 bg-surface text-center">
        <div className="funnel-wrap max-w-3xl">
          <h2 id="in-person-heading" className="home-section-heading">Prefer to meet in person?</h2>
          <p className="home-section-tagline">Private lessons in San Jose.</p>
          <p className="home-section-tagline mt-4">60-minute lessons at Get Down Dance Studios, with studio fees included. A single lesson is $250; five are $1,150 and ten are $2,100. Packages are valid for one year from your first lesson.</p>
          <Link href="/private-lessons/san-jose" prefetch={false} className="funnel-link mt-5">See the studio, schedules and lesson details →</Link>
        </div>
      </section>
      <section aria-labelledby="online-next-step-heading" className="py-16 px-6 text-center">
        <div className="funnel-wrap max-w-3xl">
          <h2 id="online-next-step-heading" className="home-section-heading">Let’s find your next step.</h2>
          <p className="home-section-tagline">Talk by phone with Ceech for 30 minutes about your goals and which coaching option fits. No obligation. You can book directly without completing a tutorial, signing in or submitting a video.</p>
          <Link href="/private-lessons#booking" prefetch={false} className="funnel-button mt-8">Book a Free Consultation</Link>
        </div>
      </section>
      <HomeSocialLinks />
    </main><Footer />
  </div>;
}
