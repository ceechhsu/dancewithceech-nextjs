"use client";

import { useEffect, useId, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { lessonTime, sourceURL, type DanceLesson } from "@/lib/approved-pages/dance-lessons";
import styles from "./ShortLessonModal.module.css";

const YouTubeLessonPlayer = dynamic(() => import("./YouTubeLessonPlayer"), { ssr: false });

export default function ShortLessonModal({ lesson, onClose, returnFocus }: { lesson: DanceLesson; onClose: () => void; returnFocus: HTMLElement | null }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const titleID = useId();
  const cueID = useId();
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const overflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    close.current?.focus({ preventScroll: true });
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    };
  }, [returnFocus]);
  return <dialog ref={dialog} className={styles.dialog} aria-modal="true" aria-labelledby={titleID} aria-describedby={cueID} onCancel={event => { event.preventDefault(); onClose(); }} onKeyDown={event => {
    if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
    if (event.key !== "Tab") return;
    const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], iframe, [tabindex="0"]')].filter(element => element.getClientRects().length > 0);
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }}>
    <header className={styles.header}><p>Short dance lesson · {lessonTime(lesson.duration)}</p><button ref={close} type="button" className={styles.close} onClick={onClose} aria-label="Close lesson">Close <span aria-hidden="true">×</span></button></header>
    <div className={styles.content}>
      <div className={styles.player}><YouTubeLessonPlayer videoID={lesson.publishedVideoID} title={lesson.title} url={lesson.publishedVideoURL} /></div>
      <div className={styles.details}><p className={styles.tags}>{lesson.tags.join(" · ")}</p><h2 id={titleID}>{lesson.title}</h2><p id={cueID} className={styles.cue}><strong>Practice: </strong>{lesson.practiceCue}</p>
        <a href={sourceURL(lesson)} target="_blank" rel="noopener noreferrer" className={styles.link}>Full Live · {lesson.actualLiveDate} · {lessonTime(lesson.timestamp)} ↗<span className="sr-only"> (opens in a new tab)</span></a>
        <Link href={lesson.nextStep === "beat" ? "/beat-first" : "/private-lessons#booking"} prefetch={false} className={styles.link}>{lesson.nextStep === "beat" ? "Practice with free BeatFirst →" : "Get coaching on this move →"}</Link>
        <a href={lesson.publishedVideoURL} target="_blank" rel="noopener noreferrer" className={styles.youtube}>Watch on YouTube ↗<span className="sr-only"> (opens in a new tab)</span></a>
        <p className={styles.keyboardHint}>Use Close or Escape to return to the lessons. From YouTube’s controls, Tab back to this view first.</p>
      </div>
    </div>
  </dialog>;
}
