"use client";

import { useEffect, useRef, useState } from "react";

type Track = { source: AudioBufferSourceNode; gain: GainNode };
type Player = { context: AudioContext; clip?: Promise<AudioBuffer | null>; track?: Track };
type Playback = "starting" | "playing" | "off" | "blocked";

function loadClip(player: Player, src: string) {
  if (!player.clip) {
    player.clip = fetch(src)
      .then(response => {
        if (!response.ok) throw new Error("Background audio unavailable");
        return response.arrayBuffer();
      })
      .then(buffer => player.context.decodeAudioData(buffer))
      .catch(() => {
        player.clip = undefined;
        return null;
      });
  }
  return player.clip;
}

function resume(context: AudioContext): Promise<boolean> {
  if (context.state === "running") return Promise.resolve(true);
  return new Promise(resolve => {
    // The resume promise can stay pending when autoplay is blocked.
    const deadline = window.setTimeout(() => resolve(false), 700);
    void context.resume()
      .then(() => resolve(context.state === "running"), () => resolve(false))
      .finally(() => window.clearTimeout(deadline));
  });
}

export function useFitQuestionMusic(src: string) {
  const player = useRef<Player | null>(null);
  const request = useRef(0);
  const enabled = useRef(true);
  const [playback, setPlayback] = useState<Playback>("starting");

  useEffect(() => () => {
    request.current++;
    const context = player.current?.context;
    player.current = null;
    if (context && context.state !== "closed") void context.close().catch(() => undefined);
  }, []);

  function getPlayer() {
    try {
      if (!player.current) player.current = { context: new AudioContext() };
      return player.current;
    } catch {
      return null;
    }
  }

  function prepare() {
    if (!enabled.current) return;
    const instance = getPlayer();
    if (!instance) return;
    // “Yes, that’s me” is a user gesture. Unlock audio here, but wait
    // until the video ends to start the score. Nothing plays in this call.
    void resume(instance.context);
    void loadClip(instance, src);
  }

  function start() {
    const generation = ++request.current;
    const instance = getPlayer();
    if (!instance) {
      setPlayback("blocked");
      return;
    }
    setPlayback("starting");
    void Promise.all([resume(instance.context), loadClip(instance, src)]).then(([allowed, clip]) => {
      if (generation !== request.current) return;
      if (!allowed || !clip || instance.context.state !== "running") {
        setPlayback("blocked");
        return;
      }
      try {
        const { context } = instance;
        const source = context.createBufferSource();
        const gain = context.createGain();
        const now = context.currentTime;
        source.buffer = clip;
        source.loop = true;
        source.connect(gain).connect(context.destination);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.78, now + 0.2);
        source.onended = () => { source.disconnect(); gain.disconnect(); };
        source.start(now);
        instance.track = { source, gain };
        setPlayback("playing");
      } catch {
        setPlayback("blocked");
      }
    });
  }

  function stop(fade: number) {
    request.current++;
    const instance = player.current;
    const track = instance?.track;
    if (!instance || !track) return;
    instance.track = undefined;
    const now = instance.context.currentTime;
    const volume = track.gain.gain;
    if (typeof volume.cancelAndHoldAtTime === "function") {
      volume.cancelAndHoldAtTime(now);
    } else {
      const level = volume.value;
      volume.cancelScheduledValues(now);
      volume.setValueAtTime(level, now);
    }
    volume.linearRampToValueAtTime(0, now + fade);
    track.source.stop(now + fade);
  }

  function enter() {
    if (enabled.current) start();
    else setPlayback("off");
  }

  function toggle() {
    if (!enabled.current || playback === "blocked") {
      enabled.current = true;
      start();
    } else {
      enabled.current = false;
      stop(0.12);
      setPlayback("off");
    }
  }

  return { prepare, enter, leave: () => stop(0.32), toggle, playback };
}
