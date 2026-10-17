"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { createConsultationTracker, trackConsultation } from "@/lib/analytics/consultation";

type CalendlyWindow = Window & { Calendly?: { initInlineWidget: (options: { url: string; parentElement: HTMLElement }) => void } };

export default function ConsultationBooking({ surface, title }: { surface: string; title: string }) {
  const container = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const ready = useRef(false);
  const [active, setActive] = useState(false);
  const [failed, setFailed] = useState(false);
  function initialize() {
    const element = container.current;
    const calendly = (window as CalendlyWindow).Calendly;
    if (!element || initialized.current) return;
    if (!calendly) { setFailed(true); return; }
    initialized.current = true;
    try {
      calendly.initInlineWidget({ url: "https://calendly.com/ceechhsu/30min", parentElement: element });
      const iframe = element.querySelector("iframe");
      if (iframe) iframe.title = title;
    } catch { setFailed(true); }
  }
  useEffect(() => {
    const tracker = createConsultationTracker(name => {
      if (name === "booking_open") { ready.current = true; setFailed(false); }
      trackConsultation(name, surface);
    });
    const listener = (event: MessageEvent) => {
      const expectedSource = container.current?.querySelector("iframe")?.contentWindow;
      if (event.origin === "https://calendly.com" && expectedSource && event.source === expectedSource && event.data?.event === "calendly.event_type_viewed") {
        ready.current = true;
        setFailed(false);
      }
      tracker(event, expectedSource);
    };
    window.addEventListener("message", listener);
    return () => { window.removeEventListener("message", listener); };
  }, [surface]);
  useEffect(() => {
    if (!active) return;
    // A loaded script can still fail to initialize or leave an iframe blank.
    // Show the fallback without remounting the frame or losing entered details.
    const timeout = setTimeout(() => { if (!ready.current) setFailed(true); }, 15000);
    return () => clearTimeout(timeout);
  }, [active]);
  useEffect(() => {
    if (!container.current) return;
    if (!("IntersectionObserver" in window)) {
      // Only older browsers need the eager scheduler fallback.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActive(true); return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setActive(true); observer.disconnect(); }
    }, { rootMargin: "200px" });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  return <>
    {active && <Script src="https://assets.calendly.com/assets/external/widget.js" strategy="afterInteractive" onReady={initialize} onError={() => setFailed(true)} />}
    <div ref={container} className="h-[700px] min-w-0 w-full" role="region" aria-label={title} />
    <div className="px-5 py-5 text-center">
      {failed && <p role="alert" className="mb-3 text-muted">The calendar could not load here. Open the booking page directly or contact Ceech to arrange your call.</p>}
      <a href="https://calendly.com/ceechhsu/30min" target="_blank" rel="noopener noreferrer" className="funnel-link" onClick={() => trackConsultation("consultation_link_clicked", surface)}>Open consultation booking in a new tab ↗</a>
      <p className="mt-3 text-sm text-muted">Choose a time in the scheduler’s displayed timezone. Bring your goals and questions. Required contact details stay with the booking provider and are not sent to site analytics.</p>
    </div>
  </>;
}
