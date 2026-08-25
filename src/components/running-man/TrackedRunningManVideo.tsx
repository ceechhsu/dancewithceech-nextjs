"use client";

import type { ComponentPropsWithoutRef } from "react";
import { useRef } from "react";

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
  const trackerRef = useRef<ReturnType<typeof createRunningManVideoMilestoneTracker> | null>(null);
  if (!trackerRef.current) {
    trackerRef.current = createRunningManVideoMilestoneTracker((event) => {
      trackRunningManEvent(event, { placement });
    });
  }

  return (
    <video
      {...videoProps}
      onPlay={(event) => {
        trackerRef.current?.onPlay();
        onPlay?.(event);
      }}
      onTimeUpdate={(event) => {
        const { currentTime, duration, seeking } = event.currentTarget;
        trackerRef.current?.onTimeUpdate({ currentTime, duration, seeking });
        onTimeUpdate?.(event);
      }}
      onSeeked={(event) => {
        const { currentTime, duration } = event.currentTarget;
        trackerRef.current?.onTimeUpdate({ currentTime, duration, seeking: true });
        onSeeked?.(event);
      }}
      onEnded={(event) => {
        trackerRef.current?.onEnded();
        onEnded?.(event);
      }}
    />
  );
}
