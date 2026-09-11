import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const siteRoot = path.resolve(import.meta.dirname, "..");
const heroSource = fs.readFileSync(path.join(siteRoot, "src/components/ScrollyHero.tsx"), "utf8");

test("homepage hero uses the existing video with an accessible poster fallback", () => {
  assert.match(heroSource, /src="\/hero-mobile\.mp4"/);
  assert.match(heroSource, /poster="[^"]+"/);
  assert.match(heroSource, /muted/);
  assert.match(heroSource, /playsInline/);
  assert.match(heroSource, /prefers-reduced-motion/);
});

test("homepage hero keeps its primary conversion links", () => {
  assert.match(heroSource, /href="\/private-lessons#booking"/);
  assert.match(heroSource, /href="\/about"/);
});
