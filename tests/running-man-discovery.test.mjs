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
  assert.match(banner, /September 24 to October 22, 2026/);
  assert.match(banner, /four-week live cohort/i);
  assert.match(banner, /Limited to 12 students/i);
  assert.match(banner, /\/running-man-method#enroll/);
});

test("homepage Running Man video and offer CTAs report their source placement", async () => {
  const teaserPath = new URL("../src/components/RunningManTeaser.tsx", import.meta.url);
  const [banner, teaser] = await Promise.all([
    readFile(campaignBannerPath, "utf8"),
    readFile(teaserPath, "utf8"),
  ]);

  assert.match(banner, /TrackedRunningManVideo/);
  assert.match(banner, /TrackedRunningManLink/);
  assert.match(banner, /placement="homepage_campaign_banner"/);
  assert.match(banner, /destination="enrollment_section"/);
  assert.match(teaser, /TrackedRunningManVideo/);
  assert.match(teaser, /TrackedRunningManLink/);
  assert.match(teaser, /placement="homepage_teaser"/);
  assert.match(teaser, /destination="enrollment_section"/);
});

test("temporary Running Man campaign link appears in desktop and mobile navigation", async () => {
  const [nav, mobileMenu] = await Promise.all([
    readFile(navPath, "utf8"),
    readFile(mobileMenuPath, "utf8"),
  ]);

  assert.match(nav, /CampaignNavLink/);
  assert.match(mobileMenu, /label: "Running Man"/);
  assert.match(mobileMenu, /href: "\/running-man-method"/);
});

test("Running Man navigation uses the approved launch treatment", async () => {
  const source = await readFile(campaignNavLinkPath, "utf8");

  assert.match(source, /href="\/running-man-method"/);
  assert.match(source, /rounded-full/);
  assert.match(source, />\s*NEW\s*</);
  assert.doesNotMatch(source, /navVariant/);
});
