"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const CTA_BUTTONS = (
  <div className="hero-cta-buttons" style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center" }}>
    <Link data-coaching-offer="online_coaching" href="/private-lessons#booking" prefetch={false} className="hero-primary-cta" style={{ padding: "16px 32px", minHeight: "44px", borderRadius: "9999px", backgroundColor: "#2563EB", color: "#fff", fontWeight: 600, fontSize: "1.05rem", textDecoration: "none" }}>
            Book a free 30-minute phone consultation
    </Link>
  </div>
);

function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const userPaused = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktop = window.matchMedia("(min-width: 768px) and (pointer: fine)");
    const updatePlayback = () => {
      const video = videoRef.current;
      if (!video) return;
      if (preference.matches || !desktop.matches || userPaused.current) video.pause();
      else {
        // Keep the source out of the initial HTML so mobile never downloads
        // background video until the visitor explicitly chooses to play it.
        if (!video.getAttribute("src")) video.src = "/hero-mobile.mp4";
        void video.play().catch(() => { /* The play button remains available if autoplay is blocked. */ });
      }
    };
    updatePlayback();
    preference.addEventListener("change", updatePlayback);
    desktop.addEventListener("change", updatePlayback);
    return () => {
      preference.removeEventListener("change", updatePlayback);
      desktop.removeEventListener("change", updatePlayback);
    };
  }, []);

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      userPaused.current = false;
      if (!video.getAttribute("src")) video.src = "/hero-mobile.mp4";
      void video.play().catch(() => { /* Leave the control in its paused state. */ });
    } else {
      userPaused.current = true;
      video.pause();
    }
  }

  return (
    <>
    <video
      id="hero-background-video"
      ref={videoRef}
      loop
      muted
      playsInline
      preload="none"
      poster="/hero-mobile-poster.jpg"
      aria-hidden="true"
      onPlay={() => { setIsPlaying(true); setHasPlayed(true); }}
      onPause={() => setIsPlaying(false)}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
    />
    <button
      type="button"
      onClick={togglePlayback}
      aria-controls="hero-background-video"
      className="absolute bottom-6 right-6 z-10 min-h-11 rounded-full border border-white/40 bg-black/80 px-4 py-2 text-sm text-white hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-300"
    >
      {isPlaying ? "Pause animation" : hasPlayed ? "Resume animation" : "Play animation"}
    </button>
    </>
  );
}

function HeroContent() {
  return (
    <div style={{ position: "relative", minHeight: "100svh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "112px 24px 104px" }}>
      <h1 style={{ maxWidth: "960px", fontSize: "clamp(2rem, 4.8vw, 4rem)", fontWeight: 800, color: "#F9F9F9", letterSpacing: "-0.02em", lineHeight: 1.1, textShadow: "0 2px 20px rgba(0,0,0,0.6)", margin: "0 0 1rem" }}>
        <span className="block">Online Hip-Hop Dance Lessons</span>{" "}
        <span className="block whitespace-nowrap">For Adults</span>
      </h1>
      <p className="mb-6 font-semibold text-white" style={{ fontSize: "clamp(1.75rem, 3.6vw, 3rem)", lineHeight: 1.2, textShadow: "0 2px 20px rgba(0,0,0,0.6)" }}>
        It&apos;s a skill, not a gift.
      </p>
      <p style={{ textWrap: "balance", maxWidth: "680px", margin: "0 0 1rem", color: "rgba(249,249,249,0.9)", fontSize: "clamp(1rem, 2vw, 1.25rem)", lineHeight: 1.5, textShadow: "0 1px 10px rgba(0,0,0,0.9)" }}>
        Personalized video feedback. Clear corrections. Practice tailored to you.
      </p>
      <p className="mb-7 text-sm text-white/80"><Link href="/private-lessons/san-jose" prefetch={false} className="funnel-link underline underline-offset-4">In-person lessons</Link> are also available in San Jose.</p>
      {CTA_BUTTONS}
      <Link href="/dance-tutorials" prefetch={false} className="funnel-link mt-5 text-sm text-white underline underline-offset-4">Browse tutorials →</Link>
    </div>
  );
}

export default function VideoHero() {
  return (
    <section aria-label="Dance With Ceech introduction" style={{ position: "relative", overflow: "hidden", backgroundColor: "#0A0A0A" }}>
      <HeroVideo />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.16) 50%, rgba(0,0,0,0.76) 100%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.9) 100%)" }} />
      <HeroContent />
    </section>
  );
}
