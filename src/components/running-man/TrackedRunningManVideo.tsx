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
};

export default function TrackedRunningManVideo({
  placement,
  onPlay,
  onTimeUpdate,
  onSeeked,
  onEnded,
  ...videoProps
}: Props) {
  const [tracker] = useState(() =>
    createRunningManVideoMilestoneTracker((event) => {
      trackRunningManEvent(event, { placement });
    }),
  );

  return (
    <video
      {...videoProps}
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
