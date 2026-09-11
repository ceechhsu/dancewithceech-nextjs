'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import type { ReviewSummary } from '@/lib/reviews';

const TestimonialsMarquee = dynamic(() => import('@/components/TestimonialsMarquee'), {
  ssr: false,
});

const ManualVideoTestimonials = dynamic(
  () => import('@/components/ManualVideoTestimonials'),
  { ssr: false },
);

type TestimonialVideo = { videoId: string };

export default function DeferredHomeTestimonials({ items, summary }: { items: TestimonialVideo[]; summary: ReviewSummary }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!('IntersectionObserver' in window)) {
      const fallbackTimer = setTimeout(() => setIsReady(true), 0);
      return () => clearTimeout(fallbackTimer);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsReady(true);
          observer.disconnect();
        }
      },
      { rootMargin: '600px 0px' },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef}>
      {isReady ? (
        <>
          <TestimonialsMarquee summary={summary} />
          <section className="py-24 overflow-x-hidden" style={{ backgroundColor: 'var(--surface)' }}>
            <div className="px-6 text-center mb-12">
              <div className="text-sm font-medium tracking-widest uppercase mb-4" style={{ color: 'var(--accent-primary-accessible)' }}>
                Student Results
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">What Students Say on Video</h2>
              <p className="mt-3 text-sm" style={{ color: 'var(--muted)' }}>Choose a student story, then press play. Watch at your own pace.</p>
            </div>
            <ManualVideoTestimonials items={items} />
          </section>
        </>
      ) : (
        <div aria-hidden="true" style={{ minHeight: '900px' }} />
      )}
    </div>
  );
}
