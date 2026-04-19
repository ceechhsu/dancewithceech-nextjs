'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Marquee } from '@/components/ui/3d-testimonials';

const reviews = [
  {
    name: 'Jason L.',
    initials: 'JL',
    source: 'Yelp',
    body: "Zero dance experience? He'll teach you the basics. Ceech shows a move, breaks it into small steps, then builds up to the full thing. Very friendly and positive environment.",
  },
  {
    name: 'Shirley V.',
    initials: 'SV',
    source: 'Yelp',
    body: "Through dancing with Ceech, I've cultivated my love for dance, learned new styles, and befriended some of the most talented people I know. 10/10 would recommend!",
  },
  {
    name: 'Hoaxin L.',
    initials: 'HL',
    source: 'Yelp',
    body: "The best dance class I'd repeat! Ceech knows how to connect students as a group. Last month I was on a TV show and used what I learned — it rocked!",
  },
  {
    name: 'Nicole R.',
    initials: 'NR',
    source: 'Yelp',
    body: "Ceech taught me how to dance. Now I am a dance teacher — tells you a lot about my teacher! He'll instill a strong, everlasting dance foundation in your bones.",
  },
  {
    name: 'Debbie C.',
    initials: 'DC',
    source: 'Yelp',
    body: "The best hip-hop, popping, and locking instructor ever! He took my dancing to a whole other level. Whether you're a beginner or advanced, there's a spot for you.",
  },
  {
    name: 'Dillan M.',
    initials: 'DM',
    source: 'Google',
    body: "Ceech creates a fun, welcoming environment that makes you look forward to every class. He breaks everything down so it's easy to follow, no matter your level. He's the real deal!",
  },
  {
    name: 'Kelley',
    initials: 'K',
    source: 'Google',
    body: "Ceech shows patience for those new to dance while pushing them to be a better version of themselves. You'll learn essential skills and be inspired to achieve even higher levels.",
  },
  {
    name: 'Alia W.',
    initials: 'AW',
    source: 'Google',
    body: "I was nervous to join my first dance class as an adult, but Ceech's warmth and ability to break down steps built my confidence. It's no wonder so many people return to his classes.",
  },
  {
    name: 'Jadyn R.',
    initials: 'JR',
    source: 'Google',
    body: "Best dance instructor I've had — and I've taken classes with dozens of teachers. He explains moves in great detail. I leave his classes feeling more confident in both dancing and life.",
  },
  {
    name: 'Dan W.',
    initials: 'DW',
    source: 'Google',
    body: "Ceech shows the dance as it will look when learned, then breaks it down into simple parts. He's so positive and encouraging — never criticizing, just showing you the correct way.",
  },
];

function ReviewCard({ name, initials, source, body }: (typeof reviews)[number]) {
  return (
    <Card className="w-[42vw] md:w-64 border-white/10 bg-white/5 backdrop-blur-sm">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2.5 mb-3">
          <Avatar className="size-8">
            <AvatarFallback className="bg-blue-600/30 text-blue-200 text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="text-sm font-semibold text-white leading-tight">{name}</div>
            <div className="text-xs text-white/40">{source} Review</div>
          </div>
        </div>
        <div className="text-yellow-400 text-xs mb-2">★★★★★</div>
        <blockquote className="text-sm text-white/70 leading-relaxed">{body}</blockquote>
      </CardContent>
    </Card>
  );
}

const half = Math.ceil(reviews.length / 2);
const col1 = reviews.slice(0, half);
const col2 = reviews.slice(half);

export default function TestimonialsMarquee() {
  return (
    <section className="py-24 px-6" style={{ backgroundColor: "var(--background)", borderTop: "1px solid #1f1f1f" }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="text-sm font-medium tracking-widest uppercase mb-4" style={{ color: "var(--accent-primary)" }}>
            Student Reviews
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-balance">What Students Say on Google & Yelp</h2>
          <div className="flex justify-center gap-6 mt-4">
            <a
              href="https://share.google/E6jTuMATZ1KCtAPBZ"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-white"
              style={{ color: "var(--muted)" }}
            >
              <span className="text-yellow-400">★</span> 5.0 Google · 56 reviews →
            </a>
            <a
              href="https://www.yelp.com/biz/dance-with-ceech-san-jose-3"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-white"
              style={{ color: "var(--muted)" }}
            >
              <span className="text-yellow-400">★</span> 5.0 Yelp · 30 reviews →
            </a>
          </div>
        </div>

        {/* 3D marquee — desktop */}
        <div className="hidden md:flex relative h-96 w-full flex-row items-center justify-center overflow-hidden gap-1.5 [perspective:300px] rounded-2xl">
          <div
            className="flex flex-row items-center gap-4"
            style={{
              transform: 'translateX(-100px) translateY(0px) translateZ(-100px) rotateX(20deg) rotateY(-10deg) rotateZ(20deg)',
            }}
          >
            <Marquee vertical pauseOnHover repeat={3} className="[--duration:35s]">
              {col1.map((r) => <ReviewCard key={r.name} {...r} />)}
            </Marquee>
            <Marquee vertical pauseOnHover reverse repeat={3} className="[--duration:35s]">
              {col2.map((r) => <ReviewCard key={r.name} {...r} />)}
            </Marquee>
            <Marquee vertical pauseOnHover repeat={3} className="[--duration:35s]">
              {col1.map((r) => <ReviewCard key={r.name} {...r} />)}
            </Marquee>
            <Marquee vertical pauseOnHover reverse repeat={3} className="[--duration:35s]">
              {col2.map((r) => <ReviewCard key={r.name} {...r} />)}
            </Marquee>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-background" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-background" />
            <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-background" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-background" />
          </div>
        </div>

        {/* 2-column marquee — mobile */}
        <div className="flex md:hidden relative h-96 w-full flex-row items-center justify-center overflow-hidden gap-1.5 rounded-2xl">
          <div className="flex flex-row items-center gap-4">
            <Marquee vertical pauseOnHover repeat={3} className="[--duration:35s]">
              {col1.map((r) => <ReviewCard key={r.name} {...r} />)}
            </Marquee>
            <Marquee vertical pauseOnHover reverse repeat={3} className="[--duration:35s]">
              {col2.map((r) => <ReviewCard key={r.name} {...r} />)}
            </Marquee>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-background" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-background" />
          </div>
        </div>
      </div>
    </section>
  );
}
