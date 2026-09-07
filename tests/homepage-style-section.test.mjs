import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const siteRoot = path.resolve(import.meta.dirname, "..");
const homepageSource = fs.readFileSync(path.join(siteRoot, "src/app/page.tsx"), "utf8");

test("homepage does not present a five-style offering section", () => {
  assert.doesNotMatch(homepageSource, /Pick Your Style/);
  assert.doesNotMatch(homepageSource, /Five hip-hop dance styles/);
  assert.doesNotMatch(homepageSource, /Learn hip-hop, locking, popping, breaking, and house dance/);
});

test("homepage presents the America's Got Talent milestone without breaking in the primary styles navigation", () => {
  const statsSource = fs.readFileSync(path.join(siteRoot, "src/components/StatsBar.tsx"), "utf8");
  assert.match(statsSource, /stat: ['"]2010['"]/);
  assert.match(statsSource, /America's Got Talent, Season 5/);
  assert.doesNotMatch(homepageSource, /href="\/breaking-dance-moves"[^>]*>Breaking<\/Link>/);
});
