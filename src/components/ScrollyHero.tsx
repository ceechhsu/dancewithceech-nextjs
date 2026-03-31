"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const CLOUD_NAME = "dedxm1lig";
const TOTAL_FRAMES = 197;
const FRAME_URL = (i: number) =>
  `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/hero-frames/frame_${String(i).padStart(4, "0")}.jpg`;

const PHASES: [number, number, string][] = [
  [0.0, 0.3, "You think you can't dance."],
  [0.35, 0.65, "It's a skill — not a gift."],
  [0.7, 1.0, "Let us prove it."],
];

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
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameIndexRef = useRef({ value: 0 });
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const phase0Ref = useRef<HTMLDivElement>(null);
  const phase1Ref = useRef<HTMLDivElement>(null);
  const phase2Ref = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Desktop only — show video on mobile
    if (window.innerWidth < 768) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const setSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      drawFrame(frameIndexRef.current.value);
    };

    const drawFrame = (index: number) => {
      let img = imagesRef.current[index];
      if (!img?.complete) {
        for (let i = index - 1; i >= 0; i--) {
          if (imagesRef.current[i]?.complete) { img = imagesRef.current[i]; break; }
        }
      }
      if (!img?.complete || !ctx) return;

      const cw = canvas.width;
      const ch = canvas.height;
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;

      const scale = Math.max(cw / iw, ch / ih);
      const dx = (cw - iw * scale) / 2;
      const dy = (ch - ih * scale) / 2;

      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, dx, dy, iw * scale, ih * scale);
    };

    const images: HTMLImageElement[] = [];

    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = FRAME_URL(i);
      img.onload = () => drawFrame(frameIndexRef.current.value);
      images.push(img);
    }
    imagesRef.current = images;

    setSize();
    window.addEventListener("resize", setSize);

    const st = ScrollTrigger.create({
      trigger: container,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => {
        const frame = Math.min(TOTAL_FRAMES - 1, Math.floor(self.progress * TOTAL_FRAMES));
        if (frame !== frameIndexRef.current.value) {
          frameIndexRef.current.value = frame;
          drawFrame(frame);
        }
      },
    });

    const phaseRefs = [phase0Ref, phase1Ref, phase2Ref];
    const phaseTriggers: ScrollTrigger[] = [];

    PHASES.forEach(([start, end], i) => {
      const el = phaseRefs[i].current;
      if (!el) return;

      const inTrigger = ScrollTrigger.create({
        trigger: container,
        start: `${start * 100}% top`,
        end: `${(start + 0.12) * 100}% top`,
        scrub: true,
        onUpdate: (self) => {
          gsap.set(el, { opacity: self.progress, y: (1 - self.progress) * 30 });
        },
      });

      if (i < PHASES.length - 1) {
        const outTrigger = ScrollTrigger.create({
          trigger: container,
          start: `${(end - 0.1) * 100}% top`,
          end: `${end * 100}% top`,
          scrub: true,
          onUpdate: (self) => {
            gsap.set(el, { opacity: 1 - self.progress, y: -self.progress * 20 });
          },
        });
        phaseTriggers.push(outTrigger);
      }

      phaseTriggers.push(inTrigger);
    });

    const ctaEl = ctaRef.current;
    if (ctaEl) {
      const ctaTrigger = ScrollTrigger.create({
        trigger: container,
        start: "85% top",
        end: "95% top",
        scrub: true,
        onUpdate: (self) => {
          gsap.set(ctaEl, { opacity: self.progress, y: (1 - self.progress) * 20 });
        },
      });
      phaseTriggers.push(ctaTrigger);
    }

    return () => {
      st.kill();
      phaseTriggers.forEach((t) => t.kill());
      window.removeEventListener("resize", setSize);
    };
  }, []);

  return (
    <>
      {/* DESKTOP: scroll-driven canvas animation */}
      <div ref={containerRef} className="hidden md:block" style={{ height: "600vh", position: "relative" }}>
        <div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden", backgroundColor: "#0A0A0A" }}>
          <canvas
            ref={canvasRef}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.65) 100%)" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.95) 100%)" }} />

          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 24px", pointerEvents: "none" }}>
            {PHASES.map(([, , text], i) => {
              const refs = [phase0Ref, phase1Ref, phase2Ref];
              return (
                <div
                  key={i}
                  ref={refs[i]}
                  style={{ position: "absolute", opacity: 0, fontSize: "clamp(2rem, 6vw, 5rem)", fontWeight: 800, color: "#F9F9F9", letterSpacing: "-0.02em", lineHeight: 1.1, maxWidth: "800px", textShadow: "0 2px 20px rgba(0,0,0,0.5)" }}
                >
                  {text}
                </div>
              );
            })}
          </div>

          <div ref={ctaRef} style={{ position: "absolute", bottom: "10%", left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", opacity: 0 }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "#2563EB", marginBottom: "8px" }}>
              Rhythm First. Then Dance.
            </div>
            {CTA_BUTTONS}
          </div>
        </div>
      </div>

      {/* MOBILE: looping video hero */}
      <div className="block md:hidden" style={{ height: "100vh", position: "relative", overflow: "hidden", backgroundColor: "#0A0A0A" }}>
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
    </>
  );
}
