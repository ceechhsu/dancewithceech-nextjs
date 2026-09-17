import assert from "node:assert/strict";
import test from "node:test";
import { GA_MEASUREMENT_ID, initializeGoogleAnalytics, trackRunningManEvent } from "../src/lib/analytics/client";

test("Google commands use the Arguments protocol and initialize only once", () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const attributes = new Set<string>();
  const scripts: Array<{ id?: string; src?: string }> = [];
  const win = { dataLayer: [] as IArguments[] };
  Object.defineProperty(globalThis, "window", { configurable: true, value: win });
  Object.defineProperty(globalThis, "document", { configurable: true, value: {
    documentElement: {
      hasAttribute: (name: string) => attributes.has(name),
      setAttribute: (name: string) => attributes.add(name),
    },
    getElementById: (id: string) => scripts.find(script => script.id === id),
    createElement: () => ({}),
    head: { appendChild: (script: typeof scripts[number]) => scripts.push(script) },
  } });
  try {
    initializeGoogleAnalytics();
    initializeGoogleAnalytics();
    trackRunningManEvent("running_man_video_started", { source: "test" });
    assert.equal(win.dataLayer.length, 3);
    for (const command of win.dataLayer) {
      assert.equal(Object.prototype.toString.call(command), "[object Arguments]",
        "Google's command processor requires Arguments objects, not arrays");
    }
    assert.equal(win.dataLayer[0][0], "js");
    assert.equal(win.dataLayer[0].length, 2);
    assert.deepEqual(Array.from(win.dataLayer[1]), ["config", GA_MEASUREMENT_ID]);
    assert.deepEqual(Array.from(win.dataLayer[2]), ["event", "running_man_video_started", { source: "test" }]);
    assert.equal(scripts.length, 1);
    assert.equal(scripts[0].src, `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`);
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
    if (originalDocument) Object.defineProperty(globalThis, "document", originalDocument);
    else Reflect.deleteProperty(globalThis, "document");
  }
});
