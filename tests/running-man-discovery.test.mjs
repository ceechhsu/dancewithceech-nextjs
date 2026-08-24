import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const homepagePath = new URL("../src/app/page.tsx", import.meta.url);
const campaignBannerPath = new URL("../src/components/RunningManCampaignBanner.tsx", import.meta.url);
const navPath = new URL("../src/components/Nav.tsx", import.meta.url);
const campaignNavLinkPath = new URL("../src/components/CampaignNavLink.tsx", import.meta.url);
const mobileMenuPath = new URL("../src/components/MobileMenu.tsx", import.meta.url);

test("homepage promotes the live Running Man founding cohort", async () => {
  const [source, banner] = await Promise.all([
    readFile(homepagePath, "utf8"),
    readFile(campaignBannerPath, "utf8"),
  ]);

  assert.match(source, /RunningManCampaignBanner/);
  assert.match(banner, /September 24–October 22, 2026/);
  assert.match(banner, /four-week live cohort/i);
  assert.match(banner, /Limited to 12 students/i);
  assert.match(banner, /\/running-man-method#enroll/);
});

test("temporary Running Man campaign link appears in desktop and mobile navigation", async () => {
  const [nav, mobileMenu] = await Promise.all([
    readFile(navPath, "utf8"),
    readFile(mobileMenuPath, "utf8"),
  ]);

  assert.match(nav, /CampaignNavLink/);
  assert.match(mobileMenu, /label: "Running Man"/);
  assert.match(mobileMenu, /href: "\/running-man-method#enroll"/);
});

test("Running Man navigation uses the approved launch treatment", async () => {
  const source = await readFile(campaignNavLinkPath, "utf8");

  assert.match(source, /href="\/running-man-method#enroll"/);
  assert.match(source, /rounded-full/);
  assert.match(source, />\s*NEW\s*</);
  assert.doesNotMatch(source, /navVariant/);
});
