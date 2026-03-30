"use client";

import Link from "next/link";

const CTA_BUTTONS = (
  <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center" }}>
    <Link
      href="/beat-first"
      style={{
        padding: "16px 32px",
        borderRadius: "9999px",
        backgroundColor: "#2563EB",
        color: "#fff",
        fontWeight: 600,
        fontSize: "1.05rem",
        textDecoration: "none",
      }}
    >
      Test Your Rhythm — Free
    </Link>
    <Link
      href="/about"
      style={{
        padding: "16px 32px",
        borderRadius: "9999px",
        border: "1px solid rgba(255,255,255,0.25)",
        color: "#F9F9F9",
        fontWeight: 600,
        fontSize: "1.05rem",
        textDecoration: "none",
      }}
    >
      Meet Ceech
    </Link>
  </div>
);

export default function ScrollyHero() {
  return (
    <div style={{ height: "100vh", position: "relative", overflow: "hidden", backgroundColor: "#0A0A0A" }}>
      <video
        src="/hero-mobile.mp4"
        autoPlay
        loop
        muted
        playsInline
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.7) 100%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.9) 100%)" }} />

      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 32px" }}>
        <div style={{ fontSize: "clamp(2.2rem, 9vw, 3.5rem)", fontWeight: 800, color: "#F9F9F9", letterSpacing: "-0.02em", lineHeight: 1.1, textShadow: "0 2px 20px rgba(0,0,0,0.6)", marginBottom: "2rem" }}>
          It&apos;s a skill —<br />not a gift.
        </div>
        <div style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "#2563EB", marginBottom: "20px" }}>
          Rhythm First. Then Dance.
        </div>
        {CTA_BUTTONS}
      </div>
    </div>
  );
}
