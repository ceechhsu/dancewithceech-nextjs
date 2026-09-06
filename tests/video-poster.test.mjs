import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const siteRoot = path.resolve(import.meta.dirname, "..");
const posterPath = path.join(siteRoot, "public/images/running-man-method-teaser-poster.webp");

test("Running Man videos use the optimized WebP poster", () => {
  const components = [
    "src/components/RunningManTeaser.tsx",
    "src/components/RunningManCampaignBanner.tsx",
    "src/app/running-man-method/RunningManMethodPage.tsx",
  ];

  assert.equal(fs.existsSync(posterPath), true, "the optimized video poster should exist");

  for (const relativePath of components) {
    const source = fs.readFileSync(path.join(siteRoot, relativePath), "utf8");
    assert.match(source, /poster="\/images\/running-man-method-teaser-poster\.webp"/, `${relativePath} should use the WebP poster`);
    assert.doesNotMatch(source, /poster="\/images\/running-man-method-teaser-poster\.jpg"/, `${relativePath} should not use the JPEG poster`);
  }
});
