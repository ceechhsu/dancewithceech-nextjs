"use client";

import { createContext, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { isHalloweenActive, nextHalloweenCheck } from "@/lib/halloween-season";
import styles from "./HalloweenSeason.module.css";

const PREFERENCE_KEY = "dwc-halloween-depth-2026-hidden";
export const HalloweenVisibilityContext = createContext(false);
export type HalloweenPlacement = "hero" | "story" | "footer";
export const HalloweenMusicContext = createContext<{
  playingScene: HalloweenPlacement | null;
  toggleMusic: (placement: HalloweenPlacement) => boolean;
} | null>(null);

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
  const sound = useRef<HTMLAudioElement>(null);
  const requestedScene = useRef<HalloweenPlacement | null>(null);
  const playAttempt = useRef(0);
  const [playingScene, setPlayingScene] = useState<HalloweenPlacement | null>(null);
  const visible = active && !hidden;

  const invalidatePlayback = useCallback(() => {
    playAttempt.current++;
    requestedScene.current = null;
  }, []);

  const stopMusic = useCallback(() => {
    invalidatePlayback();
    const audio = sound.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setPlayingScene(null);
  }, [invalidatePlayback]);

  const toggleMusic = useCallback((placement: HalloweenPlacement) => {
    if (!visible || !isHalloweenActive(Date.now())) return false;
    const audio = sound.current;
    if (!audio) return false;
    if (requestedScene.current === placement && !audio.paused) {
      stopMusic();
      return false;
    }
    const attempt = ++playAttempt.current;
    requestedScene.current = placement;
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 0.35;
    void audio.play().catch(() => {
      // An older, cancelled play request must not cancel a newer activation.
      if (attempt === playAttempt.current) stopMusic();
    });
    return true;
  }, [visible, stopMusic]);

  function musicStarted() {
    if (visible && isHalloweenActive(Date.now()) && requestedScene.current) {
      setPlayingScene(requestedScene.current);
    } else stopMusic();
  }

  useEffect(() => {
    const audio = sound.current;
    if (audio && !visible) {
      invalidatePlayback();
      audio.pause();
      audio.currentTime = 0;
    }
    return () => {
      invalidatePlayback();
      audio?.pause();
    };
  }, [visible, invalidatePlayback]);

  function toggleDecorations() {
    const next = !hidden;
    if (next) stopMusic();
    setHidden(next);
    try { sessionStorage.setItem(PREFERENCE_KEY, String(next)); }
    catch { /* The control also works when browser storage is unavailable. */ }
  }

  const music = useMemo(() => ({ playingScene: visible ? playingScene : null, toggleMusic }), [visible, playingScene, toggleMusic]);
  return <HalloweenVisibilityContext.Provider value={visible}><HalloweenMusicContext.Provider value={music}><div className={`${className} ${styles.season}`} data-halloween={visible ? "active" : undefined}>
    {active && <button type="button" className={styles.toggle} onClick={toggleDecorations}>
      {hidden ? "Show decorations" : "Hide decorations"}
    </button>}
    {children}
    <audio ref={sound} data-halloween-sound="" src="/halloween-v2/halloween-music.mp3" preload="none" hidden aria-hidden="true"
      onPlaying={musicStarted} onPause={() => setPlayingScene(null)} onWaiting={() => setPlayingScene(null)} onEnded={stopMusic} onError={stopMusic} />
  </div></HalloweenMusicContext.Provider></HalloweenVisibilityContext.Provider>;
}
