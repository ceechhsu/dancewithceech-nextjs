'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import type { ReviewSummary } from '@/lib/reviews';

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
    body: "The best dance class I'd repeat! Ceech knows how to connect students as a group. Last month I was on a TV show and used what I learned, and it rocked!",
  },
  {
    name: 'Nicole R.',
    initials: 'NR',
    source: 'Yelp',
    body: "Ceech taught me how to dance. Now I am a dance teacher, which tells you a lot about my teacher! He'll instill a strong, everlasting dance foundation in your bones.",
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
    body: "Best dance instructor I've had, and I've taken classes with dozens of teachers. He explains moves in great detail. I leave his classes feeling more confident in both dancing and life.",
  },
  {
    name: 'Dan W.',
    initials: 'DW',
    source: 'Google',
    body: "Ceech shows the dance as it will look when learned, then breaks it down into simple parts. He's so positive and encouraging, never criticizing, just showing you the correct way.",
  },
];

function ReviewCard({ name, initials, source, body }: (typeof reviews)[number]) {
  return (
    <Card className="h-full min-w-0 border-white/15 bg-white/5">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2.5 mb-3">
          <Avatar className="size-8">
            <AvatarFallback className="bg-blue-600/30 text-blue-200 text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="text-sm font-semibold text-white leading-tight">{name}</div>
            <div className="text-xs text-white/70">{source} Review</div>
          </div>
        </div>
        <div className="text-yellow-400 text-xs mb-2">★★★★★</div>
        <blockquote className="text-base text-white/85 leading-relaxed">{body}</blockquote>
      </CardContent>
    </Card>
  );
}

const featuredNames = new Set(['Jason L.', 'Kelley', 'Alia W.']);
const featured = reviews.filter((review) => featuredNames.has(review.name));
const moreReviews = reviews.filter((review) => !featuredNames.has(review.name));

export default function TestimonialsMarquee({ summary }: { summary: ReviewSummary }) {
  return (
    <section className="py-24 px-6" style={{ backgroundColor: "var(--background)", borderTop: "1px solid #1f1f1f" }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="text-sm font-medium tracking-widest uppercase mb-4" style={{ color: "var(--accent-primary-accessible)" }}>
            Student Reviews
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-balance">What Students Say on Google & Yelp</h2>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-4">
            <a
              href="https://share.google/E6jTuMATZ1KCtAPBZ"
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center gap-2 text-sm font-medium transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-300"
              style={{ color: "var(--muted)" }}
            >
              <span className="text-yellow-400">★</span> {summary.google.rating.toFixed(1)} Google · {summary.google.reviewCount} reviews →
            </a>
            <a
              href="https://www.yelp.com/biz/dance-with-ceech-san-jose-3"
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center gap-2 text-sm font-medium transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-300"
              style={{ color: "var(--muted)" }}
            >
              <span className="text-yellow-400">★</span> {summary.yelp.rating.toFixed(1)} Yelp · {summary.yelp.reviewCount} reviews →
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {featured.map((review) => <ReviewCard key={review.name} {...review} />)}
        </div>
        <details className="group mt-8">
          <summary className="mx-auto flex min-h-11 w-fit cursor-pointer list-none items-center rounded-full border border-white/25 px-5 py-3 text-sm font-semibold text-white hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-300 [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Read more student reviews</span>
            <span className="hidden group-open:inline">Show fewer student reviews</span>
          </summary>
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
            {moreReviews.map((review) => <ReviewCard key={review.name} {...review} />)}
          </div>
        </details>
      </div>
    </section>
  );
}
