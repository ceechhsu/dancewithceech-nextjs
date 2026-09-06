import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GlassyPricingSection } from "../src/components/ui/animated-glassy-pricing";

test("pricing packages are subheadings of their lesson section", () => {
  const html = renderToStaticMarkup(React.createElement(GlassyPricingSection, {
    title: "Virtual Lessons",
    showAnimatedBackground: false,
    plans: [{
      planName: "10-Cycle Pack",
      description: "Ten coaching cycles",
      price: "$500",
      priceSuffix: "/ 10 cycles",
      features: ["30-minute Google Meet"],
      buttonText: "Book a consultation",
    }],
  }));
  const headings = [...html.matchAll(/<(h[1-6])\b[^>]*>(.*?)<\/\1>/g)]
    .map((match) => [match[1], match[2]]);
  assert.deepEqual(headings, [["h2", "Virtual Lessons"], ["h3", "10-Cycle Pack"]]);
});
