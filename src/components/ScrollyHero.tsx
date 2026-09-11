"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const CTA_BUTTONS = (
  <div className="hero-cta-buttons" style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center" }}>
    <Link href="/private-lessons#booking" className="hero-primary-cta" style={{ padding: "16px 32px", minHeight: "44px", borderRadius: "9999px", backgroundColor: "#2563EB", color: "#fff", fontWeight: 600, fontSize: "1.05rem", textDecoration: "none" }}>
            Book a Free Call
    </Link>
    <Link href="/about" className="hero-secondary-cta" style={{ padding: "16px 32px", minHeight: "44px", borderRadius: "9999px", border: "1px solid rgba(255,255,255,0.25)", color: "#F9F9F9", fontWeight: 600, fontSize: "1.05rem", textDecoration: "none" }}>
            Meet Ceech
    </Link>
  </div>
);

function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const userPaused = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePlayback = () => {
      const video = videoRef.current;
      if (!video) return;
      if (preference.matches || userPaused.current) video.pause();
      else void video.play().catch(() => { /* The resume button remains available if autoplay is blocked. */ });
    };
    updatePlayback();
    preference.addEventListener("change", updatePlayback);
    return () => preference.removeEventListener("change", updatePlayback);
  }, []);

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      userPaused.current = false;
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
      src="/hero-mobile.mp4"
      loop
      muted
      playsInline
      preload="metadata"
      poster="/hero-mobile-poster.jpg"
      aria-hidden="true"
      onPlay={() => setIsPlaying(true)}
      onPause={() => setIsPlaying(false)}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
    />
    <button
      type="button"
      onClick={togglePlayback}
      aria-controls="hero-background-video"
      className="absolute bottom-6 right-6 z-10 min-h-11 rounded-full border border-white/40 bg-black/80 px-4 py-2 text-sm text-white hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-300"
    >
      {isPlaying ? "Pause animation" : "Resume animation"}
    </button>
    </>
  );
}

function HeroContent() {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 24px" }}>
      <h1 style={{ fontSize: "clamp(2.2rem, 6vw, 5rem)", fontWeight: 800, color: "#F9F9F9", letterSpacing: "-0.02em", lineHeight: 1.1, textShadow: "0 2px 20px rgba(0,0,0,0.6)", margin: "0 0 2rem" }}>
        It&apos;s a skill.<br />Not a gift.
      </h1>
      <p style={{ maxWidth: "680px", margin: "0 0 2rem", color: "rgba(249,249,249,0.84)", fontSize: "clamp(1rem, 2vw, 1.25rem)", lineHeight: 1.5, textShadow: "0 1px 10px rgba(0,0,0,0.9)" }}>
        Hip-hop dance lessons in San Jose and online for adult beginners.
      </p>
      <div style={{ fontSize: "0.85rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#F9F9F9", marginBottom: "20px", textShadow: "0 1px 10px rgba(0,0,0,0.9)" }}>
        Rhythm First. Then Dance.
      </div>
      {CTA_BUTTONS}
    </div>
  );
}

export default function ScrollyHero() {
  return (
    <section aria-label="Dance With Ceech introduction" style={{ height: "100vh", minHeight: "600px", position: "relative", overflow: "hidden", backgroundColor: "#0A0A0A" }}>
      <HeroVideo />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.16) 50%, rgba(0,0,0,0.76) 100%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.9) 100%)" }} />
      <HeroContent />
    </section>
  );
}
