"use client";

export function trackConsultation(name: string, surface: string) {
  if (typeof window === "undefined") return;
  // Use the site's existing consent/configuration; never initialize or override it here.
  const win = window as Window & { gtag?: (command: string, name: string, params: Record<string, string>) => void };
  try {
    win.gtag?.("event", name, name.startsWith("inquiry_") ? { surface } : { surface, provider: "calendly", consultation_type: "phone_30min" });
  } catch {
    // Analytics must never turn a successful inquiry or booking into a UI failure.
  }
}

export function createConsultationTracker(track: (name: string) => void) {
  let started = false;
  const bookings = new Set<string>();
  return (message: { origin: string; source: unknown; data: unknown }, expectedSource: unknown) => {
    if (message.origin !== "https://calendly.com" || !expectedSource || message.source !== expectedSource) return;
    const data = message.data as { event?: string; payload?: { event?: { uri?: unknown } } } | null;
    if (!data || typeof data !== "object") return;
    if (data.event === "calendly.date_and_time_selected" && !started) {
      started = true;
      track("consultation_form_started");
    }
    if (data.event === "calendly.event_scheduled") {
      const uri = data.payload?.event?.uri;
      if (typeof uri !== "string" || !/^https:\/\/api\.calendly\.com\/scheduled_events\/[a-zA-Z0-9-]+$/.test(uri) || bookings.has(uri)) return;
      bookings.add(uri); // Keep provider identifiers in memory only, never send them to GA.
      track("consultation_booking_confirmed");
    }
  };
}
