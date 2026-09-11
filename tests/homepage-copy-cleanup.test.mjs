import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const siteRoot = path.resolve(import.meta.dirname, "..");
const homepageCopyFiles = [
  "src/app/page.tsx",
  "src/components/ScrollyHero.tsx",
  "src/components/TestimonialsMarquee.tsx",
  "src/components/TestimonialsCarousel.tsx",
];

test("homepage copy contains no em dash punctuation", () => {
  const copy = homepageCopyFiles
    .map((file) => fs.readFileSync(path.join(siteRoot, file), "utf8"))
    .join("\n");
  assert.doesNotMatch(copy, /—/);
});

test("BeatFirst copy describes the rhythm trainer and free action plainly", () => {
  const source = fs.readFileSync(path.join(siteRoot, "src/app/page.tsx"), "utf8");
  assert.doesNotMatch(source, /unlock real dance move tutorials/);
  assert.match(source, /Build your rhythm\. One beat at a time\./);
  assert.match(source, /Play BeatFirst Free/);
});
