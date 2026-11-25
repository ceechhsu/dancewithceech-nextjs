"use client";

import { useEffect } from "react";
import { isPrivateAttendancePath } from "@/lib/attendance/privacy";
import { trackConsultation } from "@/lib/analytics/consultation";
import { FREE_CONSULTATION_URL } from "@/lib/approved-pages/consultation";

export default function ConsultationLinkTracking() {
  useEffect(() => {
    if (isPrivateAttendancePath(window.location.pathname)) return;
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
      const path = window.location.pathname;
      const inlineBooking = url.origin === window.location.origin && url.hash === "#booking" && /^\/private-lessons(?:\/(?:san-jose|bay-area))?$/.test(url.pathname);
      const directCalendly = anchor.hasAttribute("data-consultation-link") && `${url.origin}${url.pathname}` === FREE_CONSULTATION_URL;
      if (inlineBooking || directCalendly) trackConsultation("consultation_link_clicked", surfaceForPath(path));
    };

    document.addEventListener("click", click);
    return () => document.removeEventListener("click", click);
  }, []);
  return null;
}
