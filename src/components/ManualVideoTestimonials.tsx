"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";

type Props = { items: { videoId: string }[] };

export default function ManualVideoTestimonials({ items }: Props) {
  const [selected, setSelected] = useState(0);
  const [playing, setPlaying] = useState(false);
  const index = items.length ? selected % items.length : 0;
  const item = items[index];
  if (!item) return null;

  function select(direction: number) {
    setPlaying(false);
    setSelected((index + direction + items.length) % items.length);
  }

  const controlClass = "flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-full border border-white/30 px-3 py-2 text-sm text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-300 disabled:opacity-40";

  return (
    <div role="region" aria-label="Student video testimonials" className="mx-auto max-w-sm px-6">
      <div id="student-testimonial-player" className="relative mx-auto aspect-[9/16] w-full max-w-[280px] overflow-hidden rounded-2xl border border-white/20 bg-black">
        {playing ? (
          <iframe
            key={item.videoId}
            src={`https://www.youtube-nocookie.com/embed/${item.videoId}?autoplay=1&rel=0`}
            title={`Student testimonial ${index + 1} of ${items.length}`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={`Play student testimonial ${index + 1} of ${items.length}`}
            className="absolute inset-0 cursor-pointer focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-blue-300"
          >
            <Image src={`https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`} alt="" fill sizes="280px" className="object-cover" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/15">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white">
                <Play aria-hidden="true" className="h-7 w-7 fill-current" />
              </span>
            </span>
          </button>
        )}
      </div>
      <div className="mt-5 flex items-center justify-between gap-2">
        <button type="button" onClick={() => select(-1)} disabled={items.length < 2} aria-label="Previous testimonial" aria-controls="student-testimonial-player" className={controlClass}>
          <ChevronLeft aria-hidden="true" size={18} /><span>Previous</span>
        </button>
        <p aria-live="polite" aria-atomic="true" className="whitespace-nowrap text-sm text-white/80">{index + 1} of {items.length}</p>
        <button type="button" onClick={() => select(1)} disabled={items.length < 2} aria-label="Next testimonial" aria-controls="student-testimonial-player" className={controlClass}>
          <span>Next</span><ChevronRight aria-hidden="true" size={18} />
        </button>
      </div>
    </div>
  );
}
