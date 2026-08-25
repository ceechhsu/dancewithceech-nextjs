'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

const TestimonialsMarquee = dynamic(() => import('@/components/TestimonialsMarquee'), {
  ssr: false,
});

const CircularGallery = dynamic(
  () => import('@/components/ui/circular-gallery').then((module) => module.CircularGallery),
  { ssr: false },
);

type TestimonialVideo = { videoId: string };

export default function DeferredHomeTestimonials({ items }: { items: TestimonialVideo[] }) {
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
          <TestimonialsMarquee />
          <section className="py-24 overflow-x-hidden" style={{ backgroundColor: 'var(--surface)' }}>
            <div className="px-6 text-center mb-12">
              <div className="text-sm font-medium tracking-widest uppercase mb-4" style={{ color: 'var(--accent-primary)' }}>
                Student Results
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">What Students Say on Video</h2>
              <p className="mt-3 text-sm" style={{ color: 'var(--muted)' }}>Hover to pause · Click any card to watch</p>
            </div>
            <div style={{ height: '480px' }}>
              <CircularGallery items={items} />
            </div>
          </section>
        </>
      ) : (
        <div aria-hidden="true" style={{ minHeight: '900px' }} />
      )}
    </div>
  );
}
