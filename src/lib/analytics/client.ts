"use client";

export const GA_MEASUREMENT_ID = "G-BS0RYYMYHZ";

const ANALYTICS_MARKER = "data-dwc-analytics";
const GA_SCRIPT_ID = "dwc-ga-script";
const CHECKOUT_EVENT_TIMEOUT_MS = 250;

export const RUNNING_MAN_EVENTS = {
  videoStarted: "running_man_video_started",
  videoReachedMidpoint: "running_man_video_reached_midpoint",
  videoCompleted: "running_man_video_completed",
  offerCtaClicked: "running_man_offer_cta_clicked",
  privateCoachingSelected: "running_man_private_coaching_selected",
  checkoutOpened: "running_man_checkout_opened",
  waitlistJoined: "running_man_waitlist_joined",
} as const;

type Gtag = (command: string, eventName: string | Date, parameters?: Record<string, unknown>) => void;

type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: Gtag;
};

type Timer = ReturnType<typeof setTimeout>;

type RunningManAnalyticsDependencies = {
  ensureReady: () => void;
  send: (name: string, parameters: Record<string, unknown>) => void;
  setTimeout: (callback: () => void, timeoutMs: number) => Timer;
  clearTimeout: (timer: Timer) => void;
};

export type RunningManTier = "founding_197" | "founding_247" | "standard_297";

type CheckoutInput = {
  tier: RunningManTier;
  coachingSelected: boolean;
  value: number;
};

function checkoutParameters(input: CheckoutInput) {
  return {
    tier: input.tier,
    coaching_selected: input.coachingSelected ? "yes" : "no",
    value: input.value,
    currency: "USD",
  };
}

export function initializeGoogleAnalytics() {
  if (typeof window === "undefined") return;

  const win = window as AnalyticsWindow;
  if (!win.gtag) {
    win.dataLayer = win.dataLayer || [];
    win.gtag = (command, eventName, parameters) => {
      win.dataLayer?.push([command, eventName, parameters]);
    };
  }

  if (!document.documentElement.hasAttribute(ANALYTICS_MARKER)) {
    document.documentElement.setAttribute(ANALYTICS_MARKER, "loaded");
    win.gtag("js", new Date());
    win.gtag("config", GA_MEASUREMENT_ID);
  }

  if (!document.getElementById(GA_SCRIPT_ID)) {
    const gaScript = document.createElement("script");
    gaScript.id = GA_SCRIPT_ID;
    gaScript.async = true;
    gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(gaScript);
  }
}

export function createRunningManAnalytics(dependencies: RunningManAnalyticsDependencies) {
  function track(name: string, parameters: Record<string, unknown> = {}) {
    dependencies.ensureReady();
    dependencies.send(name, parameters);
  }

  return {
    track,
    trackCheckoutOpened(input: CheckoutInput) {
      track(RUNNING_MAN_EVENTS.checkoutOpened, checkoutParameters(input));
    },
    trackCheckoutThen(input: CheckoutInput & { redirect: () => void }) {
      dependencies.ensureReady();
      let redirected = false;
      let timeout: Timer | undefined;
      const redirectOnce = () => {
        if (redirected) return;
        redirected = true;
        if (timeout !== undefined) dependencies.clearTimeout(timeout);
        input.redirect();
      };

      timeout = dependencies.setTimeout(redirectOnce, CHECKOUT_EVENT_TIMEOUT_MS);
      dependencies.send(RUNNING_MAN_EVENTS.checkoutOpened, {
        ...checkoutParameters(input),
        event_callback: redirectOnce,
        event_timeout: CHECKOUT_EVENT_TIMEOUT_MS,
        transport_type: "beacon",
      });
    },
  };
}

export function trackRunningManEvent(name: string, parameters: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  createBrowserAnalytics().track(name, parameters);
}

export function trackRunningManCheckoutThen(input: CheckoutInput & { redirect: () => void }) {
  if (typeof window === "undefined") {
    input.redirect();
    return;
  }
  createBrowserAnalytics().trackCheckoutThen(input);
}

function createBrowserAnalytics() {
  const win = window as AnalyticsWindow;
  return createRunningManAnalytics({
    ensureReady: initializeGoogleAnalytics,
    send: (name, parameters) => win.gtag?.("event", name, parameters),
    setTimeout: (callback, timeoutMs) => window.setTimeout(callback, timeoutMs),
    clearTimeout: (timer) => window.clearTimeout(timer),
  });
}

export function createRunningManVideoMilestoneTracker(track: (event: string) => void) {
  let started = false;
  let reachedMidpoint = false;
  let completed = false;
  let midpointSkippedBySeeking = false;

  return {
    onPlay() {
      if (started) return;
      started = true;
      track(RUNNING_MAN_EVENTS.videoStarted);
    },
    onTimeUpdate({ currentTime, duration, seeking }: { currentTime: number; duration: number; seeking: boolean }) {
      if (!Number.isFinite(duration) || duration <= 0 || reachedMidpoint) return;
      if (seeking && currentTime >= duration / 2) {
        midpointSkippedBySeeking = true;
        return;
      }
      if (!seeking && !midpointSkippedBySeeking && currentTime >= duration / 2) {
        reachedMidpoint = true;
        track(RUNNING_MAN_EVENTS.videoReachedMidpoint);
      }
    },
    onEnded() {
      if (completed) return;
      completed = true;
      track(RUNNING_MAN_EVENTS.videoCompleted);
    },
  };
}
