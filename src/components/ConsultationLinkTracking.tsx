"use client";

import { useEffect } from "react";
import { trackConsultation } from "@/lib/analytics/consultation";

export default function ConsultationLinkTracking() {
  useEffect(() => {
    const surfaceForPath = (path: string) => ({
      "/": "home",
      "/private-lessons": "private_lessons",
      "/private-lessons/san-jose": "san_jose",
      "/private-lessons/bay-area": "bay_area",
    })[path] ?? "other_page";
    const click = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin === window.location.origin && url.hash === "#booking" && /^\/private-lessons(?:\/(?:san-jose|bay-area))?$/.test(url.pathname)) {
        trackConsultation("consultation_link_clicked", surfaceForPath(window.location.pathname));
      }
    };

    document.addEventListener("click", click);
    return () => document.removeEventListener("click", click);
  }, []);
  return null;
}
