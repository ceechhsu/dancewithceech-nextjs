import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const homepagePath = new URL("../src/app/page.tsx", import.meta.url);
const campaignBannerPath = new URL("../src/components/RunningManCampaignBanner.tsx", import.meta.url);
const navPath = new URL("../src/components/Nav.tsx", import.meta.url);
const campaignNavLinkPath = new URL("../src/components/CampaignNavLink.tsx", import.meta.url);
const mobileMenuPath = new URL("../src/components/MobileMenu.tsx", import.meta.url);

test("homepage promotes the evergreen Running Man lesson without closed-cohort claims", async () => {
  const [source, banner] = await Promise.all([
    readFile(homepagePath, "utf8"),
    readFile(campaignBannerPath, "utf8"),
  ]);

  assert.match(source, /RunningManCampaignBanner/);
  assert.match(banner, /Learn the Running Man one count at a time/i);
  assert.match(banner, /beginner-friendly, rhythm-first lesson/i);
  assert.match(banner, /Explore the lesson/i);
  assert.match(banner, /Interested in a future live class\?/i);
  assert.match(banner, /Get updates/i);
  assert.doesNotMatch(banner, /September 24 to October 22, 2026/);
  assert.doesNotMatch(banner, /Founding Cohort|live coaching series|Limited to 12 students/i);
  assert.doesNotMatch(banner, /price updates live|Only 12 students|#enroll/i);
});

test("homepage Running Man demo and evergreen CTAs report their source placement", async () => {
  const teaserPath = new URL("../src/components/RunningManTeaser.tsx", import.meta.url);
  const [banner, teaser] = await Promise.all([
    readFile(campaignBannerPath, "utf8"),
    readFile(teaserPath, "utf8"),
  ]);

  assert.match(banner, /TrackedRunningManVideo/);
  assert.match(banner, /TrackedRunningManLink/);
  assert.match(banner, /placement="homepage_campaign_banner"/);
  assert.match(banner, /destination="method_page"/);
  assert.match(banner, /destination="class_interest"/);
  assert.match(banner, /href="\/running-man-method#interest"/);
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

test("Running Man navigation uses an understated treatment", async () => {
  const source = await readFile(campaignNavLinkPath, "utf8");

  assert.match(source, /href="\/running-man-method"/);
  assert.match(source, /text-zinc-400/);
  assert.doesNotMatch(source, />\s*NEW\s*</);
  assert.doesNotMatch(source, /navVariant/);
});
