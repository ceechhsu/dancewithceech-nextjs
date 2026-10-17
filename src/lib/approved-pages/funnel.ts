"use client";
import lessons from "@/content/approved-pages/dance-lessons.json";
import articles from "@/content/approved-pages/public-tutorial-identifiers.json";

export const funnelEvents = ["coaching_cta_click", "booking_open", "booking_form_started", "consultation_booked", "tutorial_open", "tutorial_next_step"] as const;
export type FunnelEvent = typeof funnelEvents[number];
const publicIds = new Set([...articles, ...lessons.map(lesson => lesson.id)]);
const values: Record<string, readonly string[]> = {
  placement: ["home", "private_lessons", "san_jose", "bay_area", "pricing", "navigation", "library", "tutorial", "other_page"],
  page_type: ["home", "service", "tutorial", "library", "other"],
  destination_type: ["coaching", "rhythm_trainer", "tutorial", "youtube", "source_live"],
  destination: ["/private-lessons#booking", "https://calendly.com/ceechhsu/30min", "/beat-first", "/dance-tutorials", "youtube", "source_live"],
  offer_type: ["online_coaching", "in_person", "unspecified"],
  provider: ["calendly"],
  consultation_type: ["phone_30min"],
};
export function sanitizeFunnelParameters(input: Record<string, unknown>) {
  const safe: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value !== "string") continue;
    if (key === "lesson_id" ? publicIds.has(value) : values[key]?.includes(value)) safe[key] = value;
  }
  return safe;
}
export function trackFunnelEvent(name: FunnelEvent, parameters: Record<string, unknown>) {
  if (typeof window === "undefined" || !funnelEvents.includes(name)) return;
    const pathname = window.location.pathname ?? "";
  const pageType = pathname === "/" ? "home" : pathname.startsWith("/private-lessons") ? "service" : pathname.startsWith("/blog/") ? "tutorial" : pathname === "/dance-tutorials" ? "library" : "other";
  const safe = sanitizeFunnelParameters({ page_type: pageType, ...parameters });
  if (!["dancewithceech.com", "www.dancewithceech.com"].includes(window.location.hostname)) return;
  const win = window as Window & { gtag?: (command: string, name: string, params: Record<string, string>) => void };
  try { win.gtag?.("event", name, safe); } catch { /* Measurement cannot break the visitor's next action. */ }
}
