import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const siteRoot = path.resolve(import.meta.dirname, "..");

test("homepage video hero has a name that matches its implementation", () => {
  const heroPath = path.join(siteRoot, "src/components/VideoHero.tsx");
  const homepage = fs.readFileSync(path.join(siteRoot, "src/app/page.tsx"), "utf8");

  assert.equal(fs.existsSync(heroPath), true);
  assert.match(homepage, /import VideoHero from ["']@\/components\/VideoHero["'];/);
  assert.match(homepage, /<VideoHero\s*\/>/);
});
