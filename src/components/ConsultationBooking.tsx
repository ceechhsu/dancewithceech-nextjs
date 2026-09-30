"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";
import { createConsultationTracker, trackConsultation } from "@/lib/analytics/consultation";

type CalendlyWindow = Window & { Calendly?: { initInlineWidget: (options: { url: string; parentElement: HTMLElement }) => void } };

export default function ConsultationBooking({ surface, title }: { surface: string; title: string }) {
  const container = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  function initialize() {
    const element = container.current;
    const calendly = (window as CalendlyWindow).Calendly;
    if (!element || !calendly || initialized.current) return;
    initialized.current = true;
    calendly.initInlineWidget({ url: "https://calendly.com/ceechhsu/30min", parentElement: element });
    const iframe = element.querySelector("iframe");
    if (iframe) iframe.title = title;
  }
  useEffect(() => {
    const tracker = createConsultationTracker(name => trackConsultation(name, surface));
    const listener = (event: MessageEvent) => tracker(event, container.current?.querySelector("iframe")?.contentWindow);
    window.addEventListener("message", listener);
    return () => { window.removeEventListener("message", listener); };
  }, [surface]);
  return <>
    <Script src="https://assets.calendly.com/assets/external/widget.js" strategy="afterInteractive" onReady={initialize} />
    <div ref={container} className="h-[700px] min-w-[320px]" aria-label={title} />
    <a href="https://calendly.com/ceechhsu/30min" target="_blank" rel="noopener noreferrer" onClick={() => trackConsultation("consultation_link_clicked", surface)}>Open consultation booking in a new tab</a>
  </>;
}
