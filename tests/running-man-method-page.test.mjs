import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const routePath = new URL("../src/app/running-man-method/page.tsx", import.meta.url);
const componentPath = new URL(
  "../src/app/running-man-method/RunningManMethodPage.tsx",
  import.meta.url,
);
const interestFormPath = new URL(
  "../src/components/running-man/RunningManInterestForm.tsx",
  import.meta.url,
);
const sitemapPath = new URL("../src/app/sitemap.ts", import.meta.url);

async function readSourceIfPresent(path) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return "";
    throw error;
  }
}

async function readPageSources() {
  const [route, component, interestForm] = await Promise.all([
    readFile(routePath, "utf8"),
    readFile(componentPath, "utf8"),
    readSourceIfPresent(interestFormPath),
  ]);
  return { route, component, interestForm, all: `${route}\n${component}\n${interestForm}` };
}

test("the page leads with the approved timing-first Running Man explanation", async () => {
  const { component } = await readPageSources();

  assert.match(component, /Get the Running Man on beat—one count at a time/);
  assert.match(component, /both feet land on the numbered count/);
  assert.match(component, /on the “and,” one knee is up as the other leg lands/);
  assert.match(component, /100–110 BPM/);
  assert.match(component, /say the count out loud/);
});

test("the evergreen page preserves the demo, teaching story, and transparently labeled class feedback", async () => {
  const { component } = await readPageSources();

  assert.match(component, /TrackedRunningManVideo/);
  assert.match(component, /running-man-method-teaser-web\.mp4/);
  assert.match(component, /high-school dance in San Jose in 1988/);
  assert.match(component, /ran it all night/);
  assert.match(component, /challenge them to see who could keep going longest/);
  assert.match(component, /first class/);
  assert.match(component, /aren’t reviews from Running Man Method graduates/);
  assert.match(component, /id: "YT5xMAgGdX0"/);
  assert.match(component, /id: "XuJAnRRk7fI"/);
  assert.match(component, /more than 25 years/i);
  assert.match(component, /MA in Kinesiology/);
  assert.match(component, /taught adult beginners/);
});

test("the page provides one clear path to a low-pressure interest form", async () => {
  const { component, interestForm } = await readPageSources();

  assert.match(component, /<RunningManInterestForm \/>/);
  assert.match(component, /href="#interest"/);
  assert.match(component, /Tell me about the next class/);
  assert.match(component, /id="interest"/);
  assert.match(interestForm, /name: firstName\.trim\(\)/);
  assert.match(interestForm, /type="email"[\s\S]*?required/);
  assert.match(interestForm, /Yes, email me about future Running Man classes/);
  assert.match(interestForm, /I can unsubscribe anytime/);
  assert.match(interestForm, /This is an interest list, not enrollment/);
  assert.match(interestForm, /no obligation/i);
  assert.match(interestForm, /Keep me posted/);
  assert.match(interestForm, /\/api\/running-man-waitlist/);
});

test("the page includes beginner and safety guidance without promising unconfirmed class terms", async () => {
  const { component } = await readPageSources();

  assert.match(component, /You don’t need dance experience/);
  assert.match(component, /repeated hopping/);
  assert.match(component, /hopping may be unsafe for you, skip it or check with a healthcare professional/);
  assert.match(component, /surface with some grip/);
  assert.match(component, /Dates, format, and price aren’t set yet/);
});

test("the live page and its metadata contain no expired registration offer", async () => {
  const { all, route, component } = await readPageSources();

  for (const obsoleteCopy of [
    /September 24 to October 22, 2026/,
    /Enrollment closes September 17/,
    /Limited to 12 students/,
    /\$197|\$247|\$297/,
    /First 3 Students/,
    /Next 3 Students/,
    /Remaining 6 Students/,
    /Private Coaching for \$100/,
    /Confirm Your Commitment/,
    /Graduate on October 22/,
    /I Understand and Am Ready to Enroll/,
    /Claim My Founding-Cohort Seat/,
    /Enrollment closed/,
    /View Enrollment/,
    /Register now/i,
    /\/api\/running-man\/checkout/,
    /buy\.stripe\.com/,
    /spots available at this price/i,
    /Enrollment closes/i,
  ]) {
    assert.doesNotMatch(all, obsoleteCopy);
  }

  assert.match(route, /Learn the Running Man/);
  assert.match(route, /"@type": "WebPage"/);
  assert.doesNotMatch(route, /"@type": "Course"|"@type": "Event"|"startDate"|"endDate"/);
  assert.doesNotMatch(component, /EnrollmentPanel|HeroSeatStatus/);
  assert.doesNotMatch(component, /\/api\/running-man\/enrollment-state|\/api\/running-man\/checkout|stripe\.com/);
});

test("the route remains discoverable and uses accessible page structure", async () => {
  const [{ component, route, interestForm }, sitemap] = await Promise.all([
    readPageSources(),
    readFile(sitemapPath, "utf8"),
  ]);

  assert.match(sitemap, /running-man-method/);
  assert.equal(component.match(/<h1\b/g)?.length, 1);
  assert.match(component, /<details\b/);
  assert.match(component, /<summary\b/);
  assert.match(interestForm, /<form\b/);
  assert.match(route, /alternates:[\s\S]*?canonical:/);
  assert.match(route, /application\/ld\+json/);
  assert.match(component, /<Footer \/>/);
});
