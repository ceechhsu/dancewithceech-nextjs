"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { trackFunnelEvent } from "@/lib/approved-pages/funnel";
import YouTubeLessonPlayer from "@/components/approved-pages/YouTubeLessonPlayer";
import { lessonFilters, lessonTime, searchLessons, sourceURL, type LessonFilter } from "@/lib/approved-pages/dance-lessons";

import { useTeachingLessons } from "./useTeachingLessons";
import LessonFeedStatus from "./LessonFeedStatus";

type Article = { slug: string; title: string; description: string; category: string; hasImage: boolean };
const styleLabels: Record<string, string> = { "hip-hop-dance-moves": "Hip-Hop", "locking-dance-moves": "Locking", "breaking-dance-moves": "Breaking", "funk-style-dance-moves": "Funk & Popping", "house-dance": "House" };
export default function DanceLessonLibrary({ recent = false, articles = [] }: { recent?: boolean; articles?: Article[] }) {
  const feed = useTeachingLessons();
  const danceLessons = feed.lessons;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<LessonFilter>("All");
  const [playing, setPlaying] = useState<string | null>(null);
  useEffect(() => {
    if (playing && !danceLessons.some(lesson => lesson.id === playing)) {
      // External membership changes invalidate selection, including if the item returns later.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPlaying(null);
    }
  }, [danceLessons, playing]);
  const [style, setStyle] = useState("All");
  const [limit, setLimit] = useState(12);
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    if (recent) return;
    try {
      const saved = JSON.parse(sessionStorage.getItem("dwc-lesson-search") ?? "null");
      if (saved && typeof saved.query === "string" && lessonFilters.includes(saved.filter) && (saved.style === "All" || saved.style in styleLabels)) {
        // Restore local search when returning from a canonical lesson.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setQuery(saved.query.slice(0, 120)); setFilter(saved.filter); setStyle(saved.style);
      }
    } catch { /* Search works even without browser storage. */ }
    setRestored(true);
  }, [recent]);
  useEffect(() => {
    if (!recent && restored) {
      try { sessionStorage.setItem("dwc-lesson-search", JSON.stringify({ query, filter, style })); } catch { /* Optional local convenience. */ }
    }
  }, [query, filter, style, recent, restored]);
  const lessons = recent ? danceLessons.slice(0, 6) : searchLessons(danceLessons, query, filter).filter(() => style === "All" || style === "hip-hop-dance-moves");
  const words = query.trim().toLowerCase().replace(/[-–]/g, " ").split(/\s+/).filter(Boolean);
  const matchingArticles = recent ? [] : articles.filter(article => {
    const text = `${article.title} ${article.description} ${styleLabels[article.category] ?? ""}`.toLowerCase().replace(/[-–]/g, " ");
    const skillMatches = filter === "All" || (filter === "Rhythm" ? /rhythm|beat|timing/.test(text) : filter === "Footwork" ? /footwork|step|feet|shuffle|running man/.test(text) : /isolation|isolations/.test(text));
    return (style === "All" || article.category === style) && skillMatches && words.every(word => text.includes(word));
  });
  function reset() { setQuery(""); setFilter("All"); setStyle("All"); setLimit(12); setPlaying(null); }

  return <div>
    {recent ? <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div><p className="mb-2 text-sm font-medium uppercase tracking-widest text-accent-primary-accessible">One move at a time</p>
        <h3 className="text-2xl font-bold md:text-3xl">Fresh from the studio</h3>
        <p className="mt-3 text-muted">Short lessons. One clear cue. Try it, then keep practicing.</p></div>
      <Link href="/dance-tutorials" prefetch={false} className="lesson-control rounded-full border border-white/20 px-6 py-3 font-semibold hover:bg-white/10">Browse All <span aria-hidden="true">→</span></Link>
    </div> : <div className="mb-8 space-y-5">
      <div><label htmlFor="lesson-search" className="mb-2 block text-sm font-semibold">Find your next move</label>
        <input id="lesson-search" type="search" value={query} onChange={event => { setQuery(event.target.value); setPlaying(null); }}
          placeholder="Search moves, skills or titles…" className="lesson-control w-full rounded-xl border border-white/20 bg-background px-4 py-3 text-foreground placeholder:text-muted" /></div>
      {articles.length > 0 && <div><label htmlFor="lesson-style" className="mr-3 text-sm font-semibold">Dance style</label><select id="lesson-style" value={style} onChange={event => { setStyle(event.target.value); setPlaying(null); setLimit(12); }} className="lesson-control rounded-lg border border-white/20 bg-background px-4 py-2 text-foreground"><option value="All">All styles</option>{Object.entries(styleLabels).filter(([key]) => articles.some(a => a.category === key)).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter lessons by skill">
        {lessonFilters.map(option => <button key={option} type="button" aria-pressed={filter === option}
          onClick={() => { setFilter(option); setPlaying(null); }}
          className={`lesson-control rounded-full border px-5 py-2.5 text-sm font-semibold ${filter === option ? "border-accent-primary bg-accent-primary text-white" : "border-white/20 text-muted hover:bg-white/10 hover:text-white"}`}>{option}</button>)}
        {(query || filter !== "All" || style !== "All") && <button type="button" onClick={reset} className="lesson-control rounded-lg px-4 py-2.5 text-sm text-accent-primary-accessible hover:underline">Reset</button>}
      </div>
      <p role="status" aria-live="polite" className="text-sm text-muted">{lessons.length} short lessons{articles.length > 0 ? ` · ${matchingArticles.length} full tutorials` : ""}{filter !== "All" ? ` · ${filter}` : ""}{query.trim() ? ` matching “${query.trim()}”` : " · Newest first"}</p>
    </div>}

    <LessonFeedStatus {...feed} count={danceLessons.length} />
    {!feed.loading && !feed.failed && lessons.length === 0 && matchingArticles.length === 0 && (query || filter !== "All" || style !== "All") ? <div className="rounded-2xl border border-white/10 bg-surface px-6 py-12 text-center">
      <h2 className="text-xl font-semibold">No lessons found</h2><p className="mt-3 text-muted">Try a move like two-step, a skill like balance, or clear your filters.</p>
      <button type="button" onClick={reset} className="lesson-control mt-6 rounded-full bg-accent-primary px-6 py-3 font-semibold text-white">Reset search and filters</button>
    </div> : <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {lessons.map(lesson => <article key={lesson.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-background">
        <div className="relative aspect-video min-h-[200px] bg-black">
          {playing === lesson.id ? <YouTubeLessonPlayer key={lesson.id} videoID={lesson.publishedVideoID} title={lesson.title} url={lesson.publishedVideoURL} />
            : <button type="button" onClick={() => { setPlaying(lesson.id); trackFunnelEvent("tutorial_open", { lesson_id: lesson.id, placement: recent ? "home" : "library", destination_type: "tutorial" }); }} aria-label={`Play ${lesson.title}`} className="lesson-control group absolute inset-0 w-full cursor-pointer">
              <Image src={lesson.thumbnail} alt="" fill unoptimized sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw" className="object-contain" />
              <span className="absolute inset-0 bg-black/10 group-hover:bg-black/25" />
              <span className="absolute inset-0 flex items-center justify-center"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/80 text-white"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 fill-current"><path d="M8 5v14l11-7z" /></svg></span></span>
              <span className="absolute bottom-3 right-3 rounded bg-black/90 px-2 py-1 text-xs tabular-nums text-white">{lessonTime(lesson.duration)}</span>
            </button>}
        </div>
        <div className="flex flex-1 flex-col p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-accent-primary-accessible">Short lesson{lesson.tags.length ? ` · ${lesson.tags.join(" · ")}` : ""}</p>
          <h3 className="text-xl font-bold leading-snug">{lesson.title}</h3>
          <p className="mt-4 text-sm leading-relaxed text-muted"><span className="font-semibold text-foreground">Try this: </span>{lesson.practiceCue}</p>
          <div className="mt-auto pt-5">
            {sourceURL(lesson) && <a className="lesson-control block rounded text-sm text-accent-primary-accessible hover:underline" href={sourceURL(lesson)!} target="_blank" rel="noopener noreferrer">Full Live{lesson.actualLiveDate ? ` · ${lesson.actualLiveDate}` : ""} · {lessonTime(lesson.timestamp!)} <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/10 pt-3 text-sm">
              <Link prefetch={false} href={lesson.nextStep === "beat" ? "/beat-first" : "/private-lessons#booking"} onClick={() => trackFunnelEvent("tutorial_next_step", { lesson_id: lesson.id, placement: recent ? "home" : "library", destination_type: lesson.nextStep === "beat" ? "rhythm_trainer" : "coaching", destination: lesson.nextStep === "beat" ? "/beat-first" : "/private-lessons#booking" })} className="lesson-control rounded py-2 font-semibold hover:underline">{lesson.nextStep === "beat" ? "Practice with free BeatFirst →" : "Get coaching on this move →"}</Link>
              <a href={lesson.publishedVideoURL} target="_blank" rel="noopener noreferrer" className="lesson-control rounded py-2 text-muted hover:text-white">YouTube<span className="sr-only"> (opens in a new tab)</span> ↗</a>
            </div>
          </div>
        </div>
      </article>)}
    </div>}
    {matchingArticles.length > 0 && <section className="mt-12" aria-label="Full dance tutorials"><h2 className="mb-6 text-2xl font-bold">Full tutorials · Read and practice</h2><div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{matchingArticles.slice(0, limit).map(article => <article key={article.slug} className="flex flex-col rounded-2xl border border-white/10 bg-surface p-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-accent-primary-accessible">Full tutorial · {styleLabels[article.category]}</p><h3 className="text-xl font-bold">{article.title}</h3><p className="my-4 text-sm leading-relaxed text-muted">{article.description}</p><Link href={`/blog/${article.slug}`} prefetch={false} onClick={() => trackFunnelEvent("tutorial_open", { lesson_id: article.slug, placement: "library", destination_type: "tutorial" })} className="funnel-link mt-auto">Read this tutorial →</Link><Link href="/private-lessons#booking" prefetch={false} onClick={() => trackFunnelEvent("tutorial_next_step", { lesson_id: article.slug, placement: "library", destination_type: "coaching", destination: "/private-lessons#booking" })} className="funnel-link mt-2 text-sm">Want feedback on your dancing? →</Link>
    </article>)}</div>{limit < matchingArticles.length && <button type="button" onClick={() => setLimit(n => n + 12)} className="funnel-button mt-8">Show more tutorials</button>}</section>}
  </div>;
}
