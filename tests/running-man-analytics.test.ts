import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  RUNNING_MAN_EVENTS,
  createRunningManAnalytics,
  createRunningManVideoMilestoneTracker,
} from "../src/lib/analytics/client";

test("Running Man analytics exposes the approved non-PII event names", () => {
  assert.deepEqual(RUNNING_MAN_EVENTS, {
    videoStarted: "running_man_video_started",
    videoReachedMidpoint: "running_man_video_reached_midpoint",
    videoCompleted: "running_man_video_completed",
    offerCtaClicked: "running_man_offer_cta_clicked",
    privateCoachingSelected: "running_man_private_coaching_selected",
    checkoutOpened: "running_man_checkout_opened",
    waitlistJoined: "running_man_waitlist_joined",
  });
});

test("checkout event uses approved tier, coaching, value, and currency parameters", () => {
  const events: Array<{ name: string; parameters: Record<string, unknown> }> = [];
  const analytics = createRunningManAnalytics({
    ensureReady: () => undefined,
    send: (name, parameters) => events.push({ name, parameters }),
    setTimeout: () => 1,
    clearTimeout: () => undefined,
  });

  analytics.trackCheckoutOpened({
    tier: "founding_247",
    coachingSelected: true,
    value: 347,
  });

  assert.deepEqual(events, [{
    name: "running_man_checkout_opened",
    parameters: {
      tier: "founding_247",
      coaching_selected: "yes",
      value: 347,
      currency: "USD",
    },
  }]);
});

test("checkout redirects once when Analytics acknowledges the event first", () => {
  let callback: (() => void) | undefined;
  let redirects = 0;
  let timeoutCleared = false;
  const analytics = createRunningManAnalytics({
    ensureReady: () => undefined,
    send: (_name, parameters) => {
      callback = parameters.event_callback as () => void;
    },
    setTimeout: () => 1,
    clearTimeout: () => { timeoutCleared = true; },
  });

  analytics.trackCheckoutThen({
    tier: "founding_197",
    coachingSelected: false,
    value: 197,
    redirect: () => { redirects += 1; },
  });
  callback?.();
  callback?.();

  assert.equal(redirects, 1);
  assert.equal(timeoutCleared, true);
});

test("checkout redirects once when the 250-millisecond fallback fires first", () => {
  let timeoutCallback: (() => void) | undefined;
  let redirects = 0;
  const analytics = createRunningManAnalytics({
    ensureReady: () => undefined,
    send: () => undefined,
    setTimeout: (callback) => {
      timeoutCallback = callback;
      return 1;
    },
    clearTimeout: () => undefined,
  });

  analytics.trackCheckoutThen({
    tier: "standard_297",
    coachingSelected: true,
    value: 397,
    redirect: () => { redirects += 1; },
  });
  timeoutCallback?.();
  timeoutCallback?.();

  assert.equal(redirects, 1);
});

test("video milestones count normal progress once and prevent duplicates on replay", () => {
  const events: string[] = [];
  const tracker = createRunningManVideoMilestoneTracker((event) => events.push(event));

  tracker.onPlay();
  tracker.onTimeUpdate({ currentTime: 3, duration: 15, seeking: false });
  tracker.onTimeUpdate({ currentTime: 10, duration: 15, seeking: false });
  tracker.onEnded();
  tracker.onPlay();
  tracker.onTimeUpdate({ currentTime: 12, duration: 15, seeking: false });
  tracker.onEnded();

  assert.deepEqual(events, [
    "running_man_video_started",
    "running_man_video_reached_midpoint",
    "running_man_video_completed",
  ]);
});

test("video midpoint does not count when a visitor seeks past it", () => {
  const events: string[] = [];
  const tracker = createRunningManVideoMilestoneTracker((event) => events.push(event));

  tracker.onPlay();
  tracker.onTimeUpdate({ currentTime: 9, duration: 15, seeking: true });
  tracker.onTimeUpdate({ currentTime: 10, duration: 15, seeking: false });

  assert.deepEqual(events, ["running_man_video_started"]);
});

test("deferred analytics uses the shared Google initializer after interaction or idle time", async () => {
  const componentPath = new URL("../src/components/DeferredAnalytics.tsx", import.meta.url);
  const source = await readFile(componentPath, "utf8");

  assert.match(source, /initializeGoogleAnalytics/);
  assert.match(source, /requestIdleCallback\(run, \{ timeout: 1500 \}\)/);
  assert.match(source, /setTimeout\(scheduleLoad, 3000\)/);
});
