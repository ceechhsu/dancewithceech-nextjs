"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

import { RUNNING_MAN_EVENTS, trackRunningManEvent } from "@/lib/analytics/client";

type Placement = "homepage_campaign_banner" | "homepage_teaser" | "method_page_hero" | "method_page_enrollment";
type Destination = "method_page" | "enrollment_section";

type Props = ComponentProps<typeof Link> & {
  placement: Placement;
  destination: Destination;
};

export default function TrackedRunningManLink({ placement, destination, onClick, ...linkProps }: Props) {
  return (
    <Link
      {...linkProps}
      onClick={(event) => {
        trackRunningManEvent(RUNNING_MAN_EVENTS.offerCtaClicked, { placement, destination });
        onClick?.(event);
      }}
    />
  );
}
