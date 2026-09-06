import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const siteRoot = path.resolve(import.meta.dirname, "..");

test("shared navigation and footer links do not prefetch routes", () => {
  const files = [
    "src/components/Nav.tsx",
    "src/components/MobileMenu.tsx",
    "src/components/CampaignNavLink.tsx",
    "src/components/Footer.tsx",
    "src/app/page.tsx",
  ];

  for (const relativePath of files) {
    const source = fs.readFileSync(path.join(siteRoot, relativePath), "utf8");
    assert.match(source, /prefetch=\{false\}/, `${relativePath} should disable route prefetching`);
  }
});
