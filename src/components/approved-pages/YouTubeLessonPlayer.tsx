"use client";

import { useEffect, useRef, useState } from "react";

type Player = { destroy(): void };
type PlayerAPI = {
  Player: new (iframe: HTMLIFrameElement, options: {
    events: { onError(event: { data: number }): void; onReady(): void };
  }) => Player;
};
type YouTubeWindow = Window & {
  YT?: PlayerAPI;
  onYouTubeIframeAPIReady?: () => void;
};

let apiPromise: Promise<PlayerAPI> | undefined;
function loadPlayerAPI() {
  const ytWindow = window as YouTubeWindow;
  if (ytWindow.YT?.Player) return Promise.resolve(ytWindow.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<PlayerAPI>((resolve, reject) => {
    const previousReady = ytWindow.onYouTubeIframeAPIReady;
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => fail(), 15000);
    function fail() {
      window.clearTimeout(timeout);
      apiPromise = undefined;
      script.remove();
      ytWindow.onYouTubeIframeAPIReady = previousReady;
      reject(new Error("YouTube player could not load"));
    }
    ytWindow.onYouTubeIframeAPIReady = () => {
      window.clearTimeout(timeout);
      previousReady?.();
      if (ytWindow.YT?.Player) resolve(ytWindow.YT);
      else fail();
    };
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return apiPromise;
}

export default function YouTubeLessonPlayer({ videoID, title, url }: {
  videoID: string; title: string; url: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [failure, setFailure] = useState<number | "load" | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let disposed = false;
    let player: Player | undefined;
    const host = container.current;
    // React owns the outer container; YouTube owns its children and can destroy them safely.
    loadPlayerAPI().then(api => {
      if (disposed || !host) return;
      const iframe = document.createElement("iframe");
      iframe.className = "absolute inset-0 h-full w-full";
      iframe.title = `${title} — short dance lesson`;
      iframe.loading = "lazy";
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      iframe.allow = "autoplay; encrypted-media; picture-in-picture; web-share";
      iframe.allowFullscreen = true;
      iframe.src = `https://www.youtube-nocookie.com/embed/${videoID}?enablejsapi=1&autoplay=1&playsinline=1&rel=0&origin=${encodeURIComponent(window.location.origin)}`;
      host.replaceChildren(iframe);
      player = new api.Player(iframe, { events: {
        onReady() { if (!disposed) setReady(true); },
        onError(event) {
          if (!disposed) {
            setFailure(event.data);
            host.replaceChildren();
          }
        },
      } });
    }).catch(() => { if (!disposed) setFailure("load"); });
    return () => {
      disposed = true;
      try { player?.destroy(); } catch { /* A blocked embed may already have removed its frame. */ }
      host?.replaceChildren();
    };
  }, [videoID, title]);

  return <>
    <div ref={container} className="absolute inset-0" />
    {failure !== null ? <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface px-5 text-center" data-youtube-error={failure}>
      <p role="status" className="text-sm leading-relaxed text-muted">{failure === "load" ? "The video player could not load." : "YouTube cannot play this lesson here."}</p>
      <a href={url} target="_blank" rel="noopener noreferrer" className="lesson-control inline-flex items-center rounded-full bg-accent-primary px-5 py-2 text-sm font-semibold text-white hover:opacity-90">Watch on YouTube ↗<span className="sr-only"> (opens in a new tab)</span></a>
    </div> : !ready ? <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black text-sm text-white/80" role="status">Loading lesson…</span> : null}
  </>;
}
