"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DanceLesson } from "@/lib/approved-pages/dance-lessons";
import { TEACHING_PLAYLIST_ID, MAX_PLAYLIST_STALE_MS } from "@/lib/approved-pages/teaching-playlist-config";
export function useTeachingLessons() {
  const [state, setState] = useState<{ lessons: DanceLesson[]; checkedAt: string | null; loading: boolean; failed: boolean }>({ lessons: [], checkedAt: null, loading: true, failed: false });
  const current = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    if (current.current) return;
    const controller = new AbortController(); current.current = controller;
    try {
      const response = await fetch("/api/teaching-lessons", { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error("Unavailable");
      const data = await response.json();
      if (data.playlistID !== TEACHING_PLAYLIST_ID || !Array.isArray(data.lessons) || !Number.isFinite(Date.parse(data.checkedAt)) || Date.now() - Date.parse(data.checkedAt) > MAX_PLAYLIST_STALE_MS) throw new Error("Invalid snapshot");
      if (!controller.signal.aborted) setState({ lessons: data.lessons, checkedAt: data.checkedAt, loading: false, failed: false });
    } catch {
      if (!controller.signal.aborted) setState(previous => ({ ...previous, lessons: previous.checkedAt && Date.now() - Date.parse(previous.checkedAt) <= MAX_PLAYLIST_STALE_MS ? previous.lessons : [], loading: false, failed: true }));
    } finally { if (current.current === controller) current.current = null; }
  }, []);
  useEffect(() => {
    void refresh();
    // Low-frequency upstream revalidation is server-owned. A visible view checks the cached endpoint
    // once a minute so the first stale-while-revalidate response does not delay updates another 15m.
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    const interval = setInterval(onVisible, 60_000);
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", onVisible); current.current?.abort(); current.current = null; };
  }, [refresh]);
  return { ...state, retry: refresh };
}
