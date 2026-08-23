import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const routePath = new URL("../src/app/running-man-method/page.tsx", import.meta.url);
const componentPath = new URL(
  "../src/app/running-man-method/RunningManMethodPage.tsx",
  import.meta.url,
);
const sitemapPath = new URL("../src/app/sitemap.ts", import.meta.url);

async function readRouteSource() {
  const [route, component] = await Promise.all([
    readFile(routePath, "utf8"),
    readFile(componentPath, "utf8"),
  ]);

  return `${route}\n${component}`;
}

test("the Running Man Method route presents the approved founding-cohort hero", async () => {
  const source = await readRouteSource();

  assert.match(
    source,
    /Learn the Running Man—and Finally Feel Ready to Join the Dance Floor/,
  );
  assert.match(source, /September 24–October 22, 2026/);
  assert.match(source, /From \$197/);
  assert.match(source, /Enrollment closes September 17/);
  assert.match(source, /Adults 18\+/);
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
    /First 3 Students.*\$197/s,
    /Next 3 Students.*\$247/s,
    /Remaining 6 Students.*\$297/s,
    /Private Coaching for \$100/,
    /Frequently Asked Questions/,
    /Graduate on October 22/,
    /20% off their next eligible Dance With Ceech Method/,
  ];

  for (const pattern of requiredCopy) {
    assert.match(source, pattern);
  }
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

test("each enrollment option opens its matching live Stripe checkout", async () => {
  const component = await readFile(componentPath, "utf8");

  assert.match(component, /https:\/\/buy\.stripe\.com\/3cI3cw5np5nN3FD1D99bO00/);
  assert.match(component, /https:\/\/buy\.stripe\.com\/9B63cw035g2rekh0z59bO01/);
  assert.match(component, /https:\/\/buy\.stripe\.com\/dRm14oeXZ4jJ1xv6Xt9bO02/);
  assert.match(component, /https:\/\/buy\.stripe\.com\/4gMbJ2dTVdUj2BzbdJ9bO03/);
  assert.match(component, /href=\{checkoutLinks\.firstThree\}/);
  assert.match(component, /href=\{checkoutLinks\.nextThree\}/);
  assert.match(component, /href=\{checkoutLinks\.remainingSix\}/);
  assert.match(component, /href=\{checkoutLinks\.privateCoaching\}/);
});
