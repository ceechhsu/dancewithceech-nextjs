import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const routePath = new URL("../src/app/running-man-method/page.tsx", import.meta.url);
const componentPath = new URL(
  "../src/app/running-man-method/RunningManMethodPage.tsx",
  import.meta.url,
);
const enrollmentPanelPath = new URL(
  "../src/components/running-man/EnrollmentPanel.tsx",
  import.meta.url,
);
const confirmationPagePath = new URL(
  "../src/app/running-man-method/confirmation/page.tsx",
  import.meta.url,
);
const waitlistRoutePath = new URL(
  "../src/app/api/running-man-waitlist/route.ts",
  import.meta.url,
);
const waitlistLibraryPath = new URL(
  "../src/lib/running-man/waitlist.ts",
  import.meta.url,
);
const sitemapPath = new URL("../src/app/sitemap.ts", import.meta.url);

async function readRouteSource() {
  const [route, component, enrollmentPanel] = await Promise.all([
    readFile(routePath, "utf8"),
    readFile(componentPath, "utf8"),
    readFile(enrollmentPanelPath, "utf8"),
  ]);

  return `${route}\n${component}\n${enrollmentPanel}`;
}

test("the Running Man Method route presents the approved founding-cohort hero", async () => {
  const source = await readRouteSource();

  assert.match(
    source,
    /Learn the Running Man—and Finally Feel Ready to Join the Dance Floor/,
  );
  assert.match(source, /September 24–October 22, 2026/);
  assert.match(source, /Enrollment closes September 17/);
  assert.match(source, /Adults 18\+/);
  assert.match(source, /Limited to 12 students/);
  assert.match(source, /The iconic hip-hop move that creates the illusion of running in place/i);
  assert.match(source, /alt="Ceech teaching adult dance students/i);
});

test("the page carries the complete approved offer from problem through enrollment", async () => {
  const source = await readRouteSource();

  const requiredCopy = [
    /You Don.t Need More Choreography/,
    /Copying the Steps Isn.t the Same as Learning to Dance/,
    /A Clear Path From.*I Don.t Know What to Do.*to.*I Can Do This/s,
    /Is The Running Man Method Right for You/,
    /dancewithceech\.com\/beat-first/,
    /Everything You Need to Learn, Practice, and Perform/,
    /Learn From an Experienced Teacher/,
    /George.*Clear Instruction and Greater Confidence/s,
    /Martin.*I.m Not a Dancer/s,
    /Jordan.*Supportive Place to Learn/s,
    /First 3 Students/,
    /Next 3 Students/,
    /Remaining 6 Students/,
    /price: 197/,
    /price: 247/,
    /price: 297/,
    /Private Coaching for \$100/,
    /Frequently Asked Questions/,
    /Graduate on October 22/,
    /20% off their next eligible Dance With Ceech Method/,
  ];

  for (const pattern of requiredCopy) {
    assert.match(source, pattern);
  }
});

test("the hero exposes live founding-seat urgency with a safe fallback", async () => {
  const source = await readRouteSource();
  const heroStatusPath = new URL("../src/components/running-man/HeroSeatStatus.tsx", import.meta.url);
  const heroStatus = await readFile(heroStatusPath, "utf8");

  assert.match(source, /<HeroSeatStatus \/>/);
  assert.match(heroStatus, /\/api\/running-man\/enrollment-state/);
  assert.match(heroStatus, /Only 12 students/);
  assert.match(heroStatus, /aria-live="polite"/);
  assert.match(heroStatus, /seatsRemaining/);
});

test("the final enrollment reminder repeats the live seat urgency", async () => {
  const source = await readRouteSource();
  const heroStatusPath = new URL("../src/components/running-man/HeroSeatStatus.tsx", import.meta.url);
  const heroStatus = await readFile(heroStatusPath, "utf8");

  assert.match(source, /Limited to 12 students/);
  assert.match(source, /<HeroSeatStatus compact showPrice \/>/);
  assert.doesNotMatch(source, /From \$197 · Paid in full/);
  assert.match(heroStatus, /activeTier\.priceCents/);
  assert.match(heroStatus, /Paid in full/);
  assert.match(heroStatus, /Current price updates live/);
});

test("the page is discoverable and uses accessible, resilient interaction patterns", async () => {
  const [source, component, sitemap] = await Promise.all([
    readRouteSource(),
    readFile(componentPath, "utf8"),
    readFile(sitemapPath, "utf8"),
  ]);

  assert.match(sitemap, /running-man-method/);
  assert.equal(component.match(/<h1\b/g)?.length, 1);
  assert.match(component, /<details\b/);
  assert.match(component, /<summary\b/);
  assert.match(component, /<iframe[\s\S]*?title=/);
  assert.match(component, /fixed inset-x-0 bottom-0/);
  assert.match(source, /application\/ld\+json/);
  assert.match(source, /"@type": "Course"/);
  assert.match(source, /"@type": "Event"/);
});

test("the page delegates enrollment to one dynamic enrollment panel", async () => {
  const component = await readFile(componentPath, "utf8");

  assert.doesNotMatch(component, /buy\.stripe\.com/);
  assert.match(component, /EnrollmentPanel/);
  assert.equal(component.match(/Claim .*\$197/g)?.length ?? 0, 0);
  assert.match(component, /href="#enroll"/);
});

test("the enrollment panel handles a completed attempt response", async () => {
  const enrollmentPanel = await readFile(enrollmentPanelPath, "utf8");

  assert.match(enrollmentPanel, /window\.location\.assign\(body\.confirmationUrl\)/);
});

test("the active price card shows live claimed and remaining seats", async () => {
  const enrollmentPanel = await readFile(enrollmentPanelPath, "utf8");

  assert.match(enrollmentPanel, /tier\.claimed/);
  assert.match(enrollmentPanel, /tier\.remaining/);
});

test("sold-out offers are visibly stamped and remain non-interactive", async () => {
  const enrollmentPanel = await readFile(enrollmentPanelPath, "utf8");

  assert.match(enrollmentPanel, /SOLD OUT/);
  assert.match(enrollmentPanel, /Private Coaching — Sold Out/);
  assert.match(enrollmentPanel, /tier\.status === "complete"/);
  assert.match(enrollmentPanel, /coachingStatus === "sold_out"/);
  assert.match(enrollmentPanel, /\/running-man\/sold-out-stamp-option-2\.png/);
  assert.match(enrollmentPanel, /alt="SOLD OUT"/);
  assert.match(enrollmentPanel, /object-contain/);
  assert.match(enrollmentPanel, /relative rounded-3xl border p-7/);
  assert.match(enrollmentPanel, /absolute inset-0 z-0 overflow-hidden rounded-3xl/);
  assert.match(enrollmentPanel, /disabled=\{!coachingAvailable \|\| isSubmitting\}/);
});

test("sold-out enrollment offers a dedicated consent-based waitlist", async () => {
  const [enrollmentPanel, waitlistRoute, waitlistLibrary] = await Promise.all([
    readFile(enrollmentPanelPath, "utf8"),
    readFile(waitlistRoutePath, "utf8"),
    readFile(waitlistLibraryPath, "utf8"),
  ]);

  assert.match(enrollmentPanel, /showWaitlist/);
  assert.match(enrollmentPanel, /\/api\/running-man-waitlist/);
  assert.match(enrollmentPanel, /marketingConsent/);
  assert.match(enrollmentPanel, /Joining the waitlist is not a paid reservation/);
  assert.match(waitlistLibrary, /RUNNING_MAN_SYSTEME_WAITLIST_TAG_ID/);
  assert.match(waitlistRoute, /SYSTEME_API_KEY/);
  assert.match(waitlistRoute, /x-vercel-forwarded-for/);
});

test("the confirmation page returns students to the Dance With Ceech homepage", async () => {
  const confirmationPage = await readFile(confirmationPagePath, "utf8");

  assert.match(confirmationPage, /href="\/"[\s\S]*Dance With Ceech Homepage/);
});
