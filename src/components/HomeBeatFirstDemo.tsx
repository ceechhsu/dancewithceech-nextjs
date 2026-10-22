"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { Trophy } from "lucide-react";
import type { Attempt } from "./beatfirst-preview/progress";
import { nextHomeDemoBest, type HomeDemoBest } from "./beatfirst-preview/home-demo-best";
import styles from "./HomeBeatFirstDemo.module.css";

const ClapGame = dynamic(() => import("./beatfirst-preview/ClapGame"), {
  loading: () => <div className={styles.loading} role="status">Getting the demo ready…</div>,
});

export default function HomeBeatFirstDemo() {
  const router = useRouter();
  const demoRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [round, setRound] = useState(0);
  const [best, setBest] = useState<HomeDemoBest>();
  const finishSample = useCallback((attempt: Attempt) => {
    setBest(current => nextHomeDemoBest(current, attempt));
  }, []);

  const onActive = useCallback((playing: boolean) => {
    setActive(playing);
    if (playing && window.matchMedia('(max-width: 767px)').matches) {
      demoRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  }, []);

  const stopRound = () => {
    setActive(false);
    setRound(current => current + 1);
  };

  return (
    <div className={styles.demo} ref={demoRef}>
      <ClapGame
        key={round}
        levelId={1}
        personalBest={best?.score}
        onComplete={finishSample}
        onActive={onActive}
        onNext={() => router.push('/beat-first')}
        nextLabel="Continue with BeatFirst"
      />
      <div className={styles.controls}>
        {active ? <button type="button" onClick={stopRound}>Stop round</button> : <p>Try ten seconds here. Sound starts when you press play.</p>}
      </div>
      {best !== undefined && <div className={styles.personalBest} role="status" aria-live="polite">
        <Trophy size={20} aria-hidden="true" />
        <div><p>Your best this visit</p><strong>{best.hits}<span> / 15 beats</span></strong></div>
        <div className={styles.timingBest}><p>Best timing</p><strong>{best.score}<span> / 100</span></strong></div>
        <small>Can you beat your best? Resets when you refresh.</small>
      </div>}
    </div>
  );
}
