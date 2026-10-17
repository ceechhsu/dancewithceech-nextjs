"use client";

import { useEffect, useId, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { danceLessons, lessonTime } from "@/lib/approved-pages/dance-lessons";
import { trackFunnelEvent } from "@/lib/approved-pages/funnel";
import styles from "./RecentDanceLessons.module.css";

const ShortLessonModal = dynamic(() => import("./ShortLessonModal"), { ssr: false });

// The homepage needs playback only. Keep catalog search, style filtering and
// storage restoration in the catalog route rather than its initial bundle.
export default function RecentDanceLessons() {
  const [playing, setPlaying] = useState<string | null>(null);
  const [returnFocus, setReturnFocus] = useState<HTMLElement | null>(null);
  const selected = danceLessons.find(lesson => lesson.id === playing);
  const rail = useRef<HTMLUListElement>(null);
  const railID = useId();
  const headingID = useId();
  const [edges, setEdges] = useState({ start: true, end: false });
  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    const update = () => setEdges({ start: element.scrollLeft <= 2, end: element.scrollLeft + element.clientWidth >= element.scrollWidth - 2 });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    element.addEventListener("scroll", update, { passive: true });
    return () => { observer.disconnect(); element.removeEventListener("scroll", update); };
  }, []);
  function move(direction: number) {
    const element = rail.current;
    if (!element) return;
    setPlaying(null);
    element.scrollBy({ left: direction * element.clientWidth * .85, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
  return <section aria-labelledby={headingID} aria-roledescription="carousel" className={styles.section}>
    <h2 id={headingID} className="home-section-heading">Quick Hip-Hop Dance Lessons</h2>
    <p className="home-section-tagline">Bite-size tips you can practice right away.</p>
    <div className={styles.header}>
      <div className={styles.actions}><Link href="/dance-tutorials" prefetch={false} className={styles.browse}>Browse All Lessons <span aria-hidden="true">→</span></Link><div className={styles.arrows}><button type="button" aria-label="Show previous short lessons" aria-controls={railID} disabled={edges.start} onClick={() => move(-1)}><ChevronLeft size={18} aria-hidden="true" /></button><button type="button" aria-label="Show next short lessons" aria-controls={railID} disabled={edges.end} onClick={() => move(1)}><ChevronRight size={18} aria-hidden="true" /></button></div></div>
    </div>
    <ul ref={rail} id={railID} className={styles.rail} tabIndex={0} aria-label="Short lessons. Use left and right arrow keys to browse." onKeyDown={event => {
      if (event.target !== event.currentTarget) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); move(event.key === "ArrowLeft" ? -1 : 1); }
      if (event.key === "Home" || event.key === "End") { event.preventDefault(); setPlaying(null); event.currentTarget.scrollTo({ left: event.key === "Home" ? 0 : event.currentTarget.scrollWidth, behavior: "auto" }); }
    }}>
      {danceLessons.slice(0, 6).map(lesson => <li key={lesson.id} className={styles.slide}><article className={styles.card}>
        <div className={styles.visual}>
          <button type="button" className="lesson-control group absolute inset-0 w-full cursor-pointer" aria-label={`Watch ${lesson.title}`} aria-haspopup="dialog" onClick={event => { setReturnFocus(event.currentTarget); setPlaying(lesson.id); trackFunnelEvent("tutorial_open", { lesson_id: lesson.id, placement: "home", destination_type: "tutorial" }); }}>
            <Image src={lesson.thumbnail} alt="" fill unoptimized sizes="208px" className="object-cover" /><span className="absolute inset-0 bg-black/10 group-hover:bg-black/25" />
            <span className="absolute inset-0 flex items-center justify-center"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/80 text-white"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 fill-current"><path d="M8 5v14l11-7z" /></svg></span></span>
            <span className="absolute bottom-3 right-3 rounded bg-black/90 px-2 py-1 text-xs tabular-nums text-white">{lessonTime(lesson.duration)}</span>
          </button>
        </div>
        <div className={styles.body}><p className="mb-2 text-xs leading-relaxed text-accent-primary-accessible">{lesson.tags.join(" · ")}</p><h3 className={styles.title}>{lesson.title}</h3></div>
      </article></li>)}
    </ul>
    {selected && <ShortLessonModal key={selected.id} lesson={selected} returnFocus={returnFocus} onClose={() => setPlaying(null)} />}
  </section>;
}
