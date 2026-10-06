import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("homepage and navigation no longer promote the retired class", async () => {
  for (const path of ["src/app/page.tsx", "src/components/Nav.tsx", "src/components/MobileMenu.tsx", "src/lib/homepage-details.ts"]) {
    const source = await read(path);
    assert.doesNotMatch(source, /RunningManCampaignBanner|CampaignNavLink|running-man-method|Running Man Method/, path);
  }
});

test("rhythm trainer links to the retained Running Man tutorial", async () => {
  const guide = await read("src/components/beatfirst-preview/BeatFirstGuide.tsx");
  assert.match(guide, /href="\/blog\/hip-hop-dance-move-running-man"/);
  assert.doesNotMatch(guide, /running-man-method|Running Man Method/);
});
