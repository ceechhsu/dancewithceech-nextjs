"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { isHalloweenActive, nextHalloweenCheck } from "@/lib/halloween-season";
import styles from "./HalloweenSeason.module.css";

const PREFERENCE_KEY = "dwc-halloween-2026-hidden";

function subscribeToSeason(onChange: () => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const refresh = () => {
    clearTimeout(timer);
    onChange();
    const delay = nextHalloweenCheck(Date.now());
    if (delay !== null) timer = setTimeout(refresh, delay);
  };
  refresh();
  // Sleeping/background tabs catch up immediately when the visitor returns.
  window.addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", refresh);
  return () => {
    clearTimeout(timer);
    window.removeEventListener("focus", refresh);
    document.removeEventListener("visibilitychange", refresh);
  };
}

function seasonSnapshot() { return isHalloweenActive(Date.now()); }
function serverSnapshot() { return false; }

export default function HalloweenSeason({ children, className }: { children: ReactNode; className: string }) {
  const active = useSyncExternalStore(subscribeToSeason, seasonSnapshot, serverSnapshot);
  const [hidden, setHidden] = useState(() => {
    try { return typeof window !== "undefined" && sessionStorage.getItem(PREFERENCE_KEY) === "true"; }
    catch { return false; }
  });

  function toggleDecorations() {
    const next = !hidden;
    setHidden(next);
    try { sessionStorage.setItem(PREFERENCE_KEY, String(next)); }
    catch { /* The control also works when browser storage is unavailable. */ }
  }

  return <div className={`${className} ${styles.season}`} data-halloween={active && !hidden ? "active" : undefined}>
    {active && <button type="button" className={styles.toggle} onClick={toggleDecorations} aria-pressed={!hidden}>
      {hidden ? "Show decorations" : "Hide decorations"}
    </button>}
    {children}
  </div>;
}
