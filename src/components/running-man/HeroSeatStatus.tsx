"use client";

import { useCallback, useEffect, useState } from "react";

import type { EnrollmentStateResponse } from "@/lib/running-man/types";

const FALLBACK_COPY = "Only 12 students";
const FALLBACK_PRICE_COPY = "Current price updates live";

function isEnrollmentResponse(value: unknown): value is EnrollmentStateResponse {
  return Boolean(value && typeof value === "object" && "kind" in value);
}

function copyForState(response: Extract<EnrollmentStateResponse, { kind: "available" }>): string {
  const { state } = response;
  if (state.enrollmentStatus === "sold_out") return "Founding cohort full";
  if (state.enrollmentStatus === "closed") return "Enrollment closed";
  if (state.seatsRemaining === null) return FALLBACK_COPY;
  if (state.seatsRemaining === 0) return "Founding cohort full";
  return `${state.seatsRemaining} seat${state.seatsRemaining === 1 ? "" : "s"} remaining`;
}

function priceForState(response: Extract<EnrollmentStateResponse, { kind: "available" }>): string {
  const { state } = response;
  if (state.enrollmentStatus === "sold_out" || state.enrollmentStatus === "closed") return "Enrollment unavailable";
  const priceCents = state.activeTier.priceCents;
  if (!Number.isFinite(priceCents) || priceCents <= 0) return FALLBACK_PRICE_COPY;
  return `$${priceCents / 100} · Paid in full`;
}

export default function HeroSeatStatus({ compact = false, showPrice = false }: { compact?: boolean; showPrice?: boolean }) {
  const [copy, setCopy] = useState(FALLBACK_COPY);
  const [priceCopy, setPriceCopy] = useState(FALLBACK_PRICE_COPY);

  const refresh = useCallback(async () => {
    try {
      const result = await fetch("/api/running-man/enrollment-state", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const body: unknown = await result.json();
      if (!isEnrollmentResponse(body) || body.kind === "unavailable") return;
      setCopy(copyForState(body));
      setPriceCopy(priceForState(body));
    } catch {
      // Keep the truthful 12-seat fallback if live availability is temporarily unavailable.
    }
  }, []);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => void refresh(), 15_000);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(interval);
    };
  }, [refresh]);

  const statusClassName = compact ? "mt-1 text-sm font-semibold text-white/80" : "mt-1 text-lg font-bold text-white";

  return (
    <>
      {showPrice ? <p className={compact ? "text-sm leading-6 text-white/55" : statusClassName}>{priceCopy}</p> : null}
      <p aria-live="polite" className={statusClassName}>{copy}</p>
    </>
  );
}
