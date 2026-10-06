"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { scoreAttempt, type Attempt } from "./beatfirst-preview/progress";
import styles from "./HomeBeatFirstDemo.module.css";

const ClapGame = dynamic(() => import("./beatfirst-preview/ClapGame"), {
  loading: () => <div className={styles.loading} role="status">Getting the demo ready…</div>,
});

export default function HomeBeatFirstDemo() {
  const router = useRouter();
  const demoRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [round, setRound] = useState(0);
  const [best, setBest] = useState<number>();
  const finishSample = useCallback((attempt: Attempt) => {
    setBest(current => Math.max(current ?? 0, scoreAttempt(attempt).score));
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
        personalBest={best}
        onComplete={finishSample}
        onActive={onActive}
        onNext={() => router.push('/beat-first')}
        nextLabel="Continue with BeatFirst"
      />
      <div className={styles.controls}>
        {active ? <button type="button" onClick={stopRound}>Stop round</button> : <p>Try ten seconds here. Sound starts when you press play.</p>}
      </div>
    </div>
  );
}
