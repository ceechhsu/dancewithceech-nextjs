"use client";

import type { ComponentPropsWithoutRef } from "react";
import { useState } from "react";

import {
  createRunningManVideoMilestoneTracker,
  trackRunningManEvent,
} from "@/lib/analytics/client";

type Placement = "homepage_campaign_banner" | "homepage_teaser" | "method_page_hero";

type Props = ComponentPropsWithoutRef<"video"> & {
  placement: Placement;
  loadOnPlay?: boolean;
};

export default function TrackedRunningManVideo({
  placement,
  loadOnPlay = false,
  onPlay,
  onTimeUpdate,
  onSeeked,
  onEnded,
  ...videoProps
}: Props) {
  const [activated, setActivated] = useState(false);
  const [tracker] = useState(() =>
    createRunningManVideoMilestoneTracker((event) => {
      trackRunningManEvent(event, { placement });
    }),
  );

  if (loadOnPlay && !activated) {
    return (
      <button
        type="button"
        onClick={() => setActivated(true)}
        className="relative block aspect-video w-full cursor-pointer bg-black focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-[#FDB515]"
        aria-label="Play Running Man preview"
      >
        {/* Native image preserves the existing poster without loading video data. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={videoProps.poster} alt="" loading="lazy" width={1280} height={720} className="absolute inset-0 h-full w-full object-cover" />
        <span className="relative inline-flex items-center gap-3 rounded-full bg-black/85 px-6 py-4 font-bold text-white">
          <span aria-hidden="true">▶</span> Play preview
        </span>
      </button>
    );
  }

  return (
    <video
      {...videoProps}
      autoPlay={loadOnPlay ? true : videoProps.autoPlay}
      onPlay={(event) => {
        tracker.onPlay();
        onPlay?.(event);
      }}
      onTimeUpdate={(event) => {
        const { currentTime, duration, seeking } = event.currentTarget;
        tracker.onTimeUpdate({ currentTime, duration, seeking });
        onTimeUpdate?.(event);
      }}
      onSeeked={(event) => {
        const { currentTime, duration } = event.currentTarget;
        tracker.onTimeUpdate({ currentTime, duration, seeking: true });
        onSeeked?.(event);
      }}
      onEnded={(event) => {
        tracker.onEnded();
        onEnded?.(event);
      }}
    />
  );
}
