import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const main = read("src/app/private-lessons/page.tsx");
const sanJose = read("src/app/private-lessons/san-jose/page.tsx");
const bayArea = read("src/app/private-lessons/bay-area/page.tsx");
const pricing = read("src/components/PrivateLessonsPricing.tsx");
const videoEval = read("src/components/VideoEvalForm.tsx");
const consultationSources = { main, sanJose, bayArea, pricing };
const virtualOfferSource = [main, bayArea, pricing].join("\n");
const virtualPricing = pricing.slice(pricing.indexOf("{/* Virtual */}"));

test("public pages never advertise the discretionary demo or a 15-minute consultation", () => {
  const durationBeforeOffer = /\b15[- ]min(?:ute)?\b[^\n"'<]{0,50}\b(?:consultation|demo)\b/i;
  const offerBeforeDuration = /\b(?:consultation|demo)\b[^\n"'<]{0,50}\b15[- ]min(?:ute)?\b/i;
  const demoPromises = /demo class|demo-class|free demo|lesson or demo|schedule your demo/i;

  for (const [name, source] of Object.entries(consultationSources)) {
    assert.doesNotMatch(source, durationBeforeOffer, `${name} has a 15-minute offer`);
    assert.doesNotMatch(source, offerBeforeDuration, `${name} has a reversed 15-minute offer`);
    assert.doesNotMatch(source, demoPromises, `${name} publicly promises the demo`);
  }
});

test("every consultation surface names the 30-minute phone call", () => {
  assert.match(main, />\s*Book Your Free 30-Minute Phone Consultation\s*</);
  assert.match(main, /Book your free 30-minute phone consultation/);
  assert.match(main, /src="https:\/\/calendly\.com\/ceechhsu\/30min"[\s\S]{0,180}title="Free 30-minute phone consultation with Ceech"/);
  assert.equal((pricing.match(/buttonText: "Book a Free 30-Minute Phone Consultation"/g) ?? []).length, 6);
  assert.match(sanJose, /Free 30-minute phone consultation/);
  assert.match(sanJose, /src="https:\/\/calendly\.com\/ceechhsu\/30min"[\s\S]{0,180}title="Free 30-minute phone consultation with Ceech in San Jose"/);
  assert.match(bayArea, /Free 30-minute phone consultation/);
  assert.match(bayArea, /src="https:\/\/calendly\.com\/ceechhsu\/30min"[\s\S]{0,180}title="Free 30-minute phone consultation with Ceech for Bay Area students"/);
});

test("each virtual pathway links to the evaluation for prospective virtual students", () => {
  assert.match(pricing, /href="\/private-lessons#video-eval"[\s\S]{0,220}prospective virtual students/i);
  assert.match(sanJose, /href="\/private-lessons#video-eval"[\s\S]{0,220}prospective virtual students/i);
  assert.match(bayArea, /href="\/private-lessons#video-eval"[\s\S]{0,220}prospective virtual students/i);
});

test("normal evaluation state defines the audience and four-part deliverable", () => {
  assert.match(videoEval, /prospective virtual/i);
  assert.match(videoEval, /short recorded feedback video/i);
  assert.match(videoEval, /short written recap/i);
  assert.match(videoEval, /one thing you are doing correctly/i);
  assert.match(videoEval, /main problem/i);
  assert.match(videoEval, /one corrective drill/i);
  assert.match(videoEval, /what to practice first/i);
  assert.match(videoEval, /within three business days/i);
  assert.match(videoEval, /One free evaluation per person/i);
});

test("successful submission repeats the response deadline", () => {
  assert.match(videoEval, /status === "success"[\s\S]{0,900}within three business days/i);
});

test("private discount details remain out of public source", () => {
  assert.doesNotMatch(videoEval, /\$50|normally \$80|\$200|seven-day|seven days|within 7 days|same-day[^\n]{0,80}(?:discount|special rate)/i);
});

test("virtual pricing uses complete one-time coaching cycles", () => {
  assert.match(virtualPricing, /One complete cycle includes one video submission/i);
  assert.match(virtualPricing, /recorded feedback within three business days/i);
  assert.match(virtualPricing, /30-minute Live Coaching Session on Google Meet/i);
  assert.match(virtualPricing, /All options are one-time purchases/i);

  assert.match(virtualPricing, /planName: "5-Cycle Pack"[\s\S]{0,320}price: "\$300"/i);
  assert.match(virtualPricing, /5 complete coaching cycles/i);
  assert.match(virtualPricing, /Use within 3 months of purchase/i);

  assert.match(virtualPricing, /planName: "10-Cycle Pack"[\s\S]{0,320}price: "\$500"/i);
  assert.match(virtualPricing, /10 complete coaching cycles/i);
  assert.match(virtualPricing, /Use within 6 months of purchase/i);

  assert.match(virtualPricing, /planName: "Single Cycle"[\s\S]{0,320}price: "\$80"/i);
  assert.match(virtualPricing, /1 complete coaching cycle/i);
  assert.doesNotMatch(virtualPricing, /isPopular: true/i);

  const tenCyclePosition = virtualPricing.indexOf('planName: "10-Cycle Pack"');
  const fiveCyclePosition = virtualPricing.indexOf('planName: "5-Cycle Pack"');
  const singleCyclePosition = virtualPricing.indexOf('planName: "Single Cycle"');
  assert.ok(tenCyclePosition < fiveCyclePosition && fiveCyclePosition < singleCyclePosition, "virtual plans should run from highest to lowest commitment");
});

test("Bay Area pricing matches the virtual coaching cycle offers", () => {
  assert.match(bayArea, /5-Cycle Pack:<\/strong> \$300/i);
  assert.match(bayArea, /10-Cycle Pack:<\/strong> \$500/i);
  assert.match(bayArea, /Single Cycle:<\/strong> \$80/i);
  assert.match(bayArea, /three months of purchase/i);
  assert.match(bayArea, /six months of purchase/i);
  assert.match(bayArea, /one video submission/i);
  assert.match(bayArea, /recorded feedback within three business days/i);
  assert.match(bayArea, /30-minute Live Coaching Session on Google Meet/i);
  assert.match(bayArea, /one-time purchases with no automatic renewal/i);
});

test("old virtual offers and Zoom references are absent from affected surfaces", () => {
  assert.doesNotMatch(virtualOfferSource, /Monthly Membership|One-Month Pack|\$250\/month|\$280|auto-renews monthly|auto-renewing|membership auto-renews|60 days/i);
  assert.doesNotMatch(virtualOfferSource, /\bZoom\b/i);
});
