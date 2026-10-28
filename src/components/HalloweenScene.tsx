"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { HalloweenMusicContext, HalloweenVisibilityContext, type HalloweenPlacement } from "./HalloweenSeason";
import styles from "./HalloweenSeason.module.css";

const locations = { hero: "in the introduction", story: "near Meet Ceech", footer: "above the footer" };
const sparks = [0, 1, 2, 3];

function PlayfulScene({ placement }: { placement: HalloweenPlacement }) {
  const music = useContext(HalloweenMusicContext);
  const playing = music?.playingScene === placement;
  const [reaction, setReaction] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timeout.current), []);

  function celebrate() {
    clearTimeout(timeout.current);
    if (!music?.toggleMusic(placement)) {
      setCelebrating(false);
      return;
    }
    setReaction(current => current + 1);
    setCelebrating(true);
    timeout.current = setTimeout(() => setCelebrating(false), 1000);
  }

  return <button type="button" className={`${styles.scene} ${styles[placement]}`}
    data-halloween-scene={placement} data-celebrating={celebrating ? "true" : undefined}
    data-music-playing={playing ? "true" : undefined}
    aria-label={playing ? `Stop Halloween music ${locations[placement]}` : `Make the pumpkin and ghost dance ${locations[placement]}`}
    title={playing ? "Click or tap to stop" : "Play a little Halloween music and dance"} onClick={celebrate}>
    <span className={styles.float} aria-hidden="true">
      <span key={reaction} className={styles.reaction} data-reaction={celebrating ? "true" : undefined} data-music-playing={playing ? "true" : undefined}>
        <span className={styles.art} />
        {celebrating && <>
          <span className={styles.boo}>Boo!</span>
          {sparks.map(spark => <span key={spark} className={styles.spark} data-halloween-spark="">✦</span>)}
        </>}
      </span>
    </span>
    {placement === "hero" && <span className={styles.hint} aria-hidden="true">{playing ? "Tap to stop" : "Tap for music + dance"}</span>}
    <span role="status" className={styles.srOnly}>{celebrating ? "Boo! Happy Halloween!" : playing ? "Halloween music playing. Activate again to stop." : ""}</span>
  </button>;
}

export default function HalloweenScene({ placement }: { placement: HalloweenPlacement }) {
  const visible = useContext(HalloweenVisibilityContext);
  return visible ? <PlayfulScene placement={placement} /> : null;
}
