"use client";

import { useContext } from "react";
import { ThanksgivingMusicContext, ThanksgivingVisibilityContext, type ThanksgivingPlacement } from "./ThanksgivingSeason";
import styles from "./ThanksgivingSeason.module.css";

const locations = { hero: "in the introduction", story: "near Meet Ceech", footer: "above the footer" };

function AutumnLeaf({ index }: { index: number }) {
  return <svg className={styles.leaf} data-leaf={index} viewBox="0 0 40 48" aria-hidden="true">
    <path d="m20 1 4 11 7-5-1 12 9-1-6 10 4 4-14 4-3 10-2-10-14-4 4-5-7-9 10 1-1-12 7 5Z" fill="currentColor" />
    <path d="m20 12-1 24m0-9-9-6m9 9 10-9" fill="none" stroke="#6d391b" strokeWidth="1.2" opacity=".55" />
  </svg>;
}

export default function ThanksgivingScene({ placement }: { placement: ThanksgivingPlacement }) {
  const visible = useContext(ThanksgivingVisibilityContext);
  const music = useContext(ThanksgivingMusicContext);
  const playing = music?.playingScene === placement;
  if (!visible) return null;

  return <button type="button" className={`${styles.scene} ${styles[placement]}`}
    data-thanksgiving-scene={placement} data-music-playing={playing ? "true" : undefined}
    aria-pressed={playing}
    aria-label={playing ? `Stop autumn sounds ${locations[placement]}` : `Make the turkey dance with soft autumn sounds ${locations[placement]}`}
    title={playing ? "Click or tap to stop" : "A little autumn dance, with soft chimes"}
    onClick={() => music?.toggleMusic(placement)}>
    <span className={styles.float} aria-hidden="true">
      <span className={styles.reaction} data-music-playing={playing ? "true" : undefined}>
        <span className={styles.art} />
      </span>
    </span>
    <span className={styles.leaves} aria-hidden="true">
      {[0, 1, 2].map(index => <AutumnLeaf key={index} index={index} />)}
      {playing && [3, 4, 5].map(index => <AutumnLeaf key={index} index={index} />)}
    </span>
    {playing && <span className={styles.greeting} aria-hidden="true">Grateful for you</span>}
    {placement === "hero" && <span className={styles.hint} aria-hidden="true">
      <svg viewBox="0 0 20 20" fill="none"><path d="M9 4 5 7H2v6h3l4 3V4ZM12 7a4 4 0 0 1 0 6m3-9a8 8 0 0 1 0 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      {playing ? "Tap to stop" : "Tap for autumn sounds"}
    </span>}
    <span role="status" className={styles.srOnly}>{playing ? "Soft autumn sounds playing. Activate again to stop." : ""}</span>
  </button>;
}
