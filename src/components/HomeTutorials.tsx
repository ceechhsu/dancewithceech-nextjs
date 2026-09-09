"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const tutorials = [
  {
    id: "cI1pSXOohMw",
    style: "Footwork",
    level: "Foundation drills",
    title: "Shuffle / Running Man",
    description: "Practice your footwork with dance-along drills you can return to between lessons.",
  },
  {
    id: "3q-Rt0D8dNI",
    style: "Locking",
    level: "Try a challenge",
    title: "Scoobot",
    description: "Ready for something more involved? Work on coordination with this locking move.",
  },
  {
    id: "oYTSAsW0i70",
    style: "Popping",
    level: "Beginner-friendly",
    title: "Follow the Leader",
    description: "Follow along with me to practice your pop, build rhythm, and explore freestyle.",
  },
];

export default function HomeTutorials() {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  return (
    <section id="dance-tutorials" aria-labelledby="tutorials-heading" className="py-20 px-6 scroll-mt-20" style={{ backgroundColor: "var(--surface)", borderTop: "1px solid #1f1f1f" }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-sm font-medium tracking-widest uppercase mb-4" style={{ color: "var(--accent-primary-accessible)" }}>Free dance tutorials</p>
          <h2 id="tutorials-heading" className="text-3xl md:text-4xl font-bold mb-4">See how I teach</h2>
          <p className="max-w-2xl mx-auto leading-relaxed" style={{ color: "var(--muted)" }}>
            Try a drill, explore a new style, or take on a challenge. These three tutorials give you a feel for practicing with me.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tutorials.map((tutorial) => (
            <article key={tutorial.id} className="min-w-0 overflow-hidden rounded-2xl border border-white/10" style={{ backgroundColor: "var(--background)" }}>
              <div className="relative aspect-video bg-black">
                {activeVideo === tutorial.id ? (
                  <iframe
                    className="absolute inset-0 h-full w-full"
                    src={`https://www.youtube-nocookie.com/embed/${tutorial.id}?autoplay=1&rel=0`}
                    title={`${tutorial.title} — dance tutorial with Ceech`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveVideo(tutorial.id)}
                    aria-label={`Play ${tutorial.title} tutorial`}
                    className="group absolute inset-0 w-full cursor-pointer focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-blue-400"
                  >
                    <Image src={`https://i.ytimg.com/vi/${tutorial.id}/hqdefault.jpg`} alt="" fill unoptimized sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" />
                    <span className="absolute inset-0 bg-black/15 transition-colors group-hover:bg-black/30" />
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/80 text-white shadow-lg transition-transform group-hover:scale-110">
                        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 fill-current"><path d="M8 5v14l11-7z" /></svg>
                      </span>
                    </span>
                  </button>
                )}
              </div>
              <div className="p-6">
                <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
                  <span className="font-semibold uppercase tracking-wider" style={{ color: "var(--accent-primary-accessible)" }}>{tutorial.style}</span>
                  <span className="rounded-full border border-white/15 px-2.5 py-1" style={{ color: "var(--muted)" }}>{tutorial.level}</span>
                </div>
                <h3 className="text-xl font-bold mb-3">{tutorial.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{tutorial.description}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-10 text-center">
          <p className="mb-5 leading-relaxed" style={{ color: "var(--muted)" }}>Want feedback on your own dancing? In private coaching, we work at your pace and focus on what you need.</p>
          <Link href="/private-lessons#booking" className="inline-block rounded-full px-7 py-3.5 font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-400" style={{ backgroundColor: "var(--accent-primary)" }}>Book a Free Call</Link>
        </div>
      </div>
    </section>
  );
}
