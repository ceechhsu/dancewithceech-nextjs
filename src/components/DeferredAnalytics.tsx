'use client';

import { useEffect } from 'react';

const GA_MEASUREMENT_ID = 'G-BS0RYYMYHZ';
const META_PIXEL_ID = '2022647098670106';
const ANALYTICS_MARKER = 'data-dwc-analytics';

type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
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
  const win = window as AnalyticsWindow;
  if (document.documentElement.hasAttribute(ANALYTICS_MARKER)) return;
  document.documentElement.setAttribute(ANALYTICS_MARKER, 'loaded');

  win.dataLayer = win.dataLayer || [];
  win.gtag = (...args: unknown[]) => {
    win.dataLayer?.push(args);
  };
  win.gtag('js', new Date());
  win.gtag('config', GA_MEASUREMENT_ID);

  if (!document.getElementById('dwc-ga-script')) {
    const gaScript = document.createElement('script');
    gaScript.id = 'dwc-ga-script';
    gaScript.async = true;
    gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(gaScript);
  }

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
