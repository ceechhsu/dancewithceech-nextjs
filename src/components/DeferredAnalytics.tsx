'use client';

import { useEffect } from 'react';

import { initializeGoogleAnalytics } from '@/lib/analytics/client';

const META_PIXEL_ID = '2022647098670106';
const META_ANALYTICS_MARKER = 'data-dwc-meta-analytics';

type AnalyticsWindow = Window & {
  fbq?: Fbq;
  _fbq?: Fbq;
};

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[];
  loaded?: boolean;
  version?: string;
};

function loadAnalytics() {
  initializeGoogleAnalytics();

  const win = window as AnalyticsWindow;
  if (document.documentElement.hasAttribute(META_ANALYTICS_MARKER)) return;
  document.documentElement.setAttribute(META_ANALYTICS_MARKER, 'loaded');

  if (!win.fbq) {
    const fbq = ((...args: unknown[]) => {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue?.push(args);
    }) as Fbq;
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = '2.0';
    win.fbq = fbq;
    win._fbq = fbq;
  }

  win.fbq?.('init', META_PIXEL_ID);
  win.fbq?.('track', 'PageView');

  if (!document.getElementById('dwc-meta-script')) {
    const metaScript = document.createElement('script');
    metaScript.id = 'dwc-meta-script';
    metaScript.async = true;
    metaScript.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(metaScript);
  }
}

export default function DeferredAnalytics() {
  useEffect(() => {
    let scheduled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const scheduleLoad = () => {
      if (scheduled) return;
      scheduled = true;
      const run = () => loadAnalytics();
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(run, { timeout: 1500 });
      } else {
        timeoutId = setTimeout(run, 0);
      }
    };

    const interactionEvents = ['pointerdown', 'keydown', 'touchstart'] as const;
    interactionEvents.forEach((eventName) => window.addEventListener(eventName, scheduleLoad, { once: true, passive: true }));
    timeoutId = setTimeout(scheduleLoad, 3000);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      interactionEvents.forEach((eventName) => window.removeEventListener(eventName, scheduleLoad));
    };
  }, []);

  return null;
}
