import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const LOCAL_PAGES = [
  "src/app/contact/page.tsx",
  "src/app/private-lessons/san-jose/page.tsx",
  "src/app/private-lessons/bay-area/page.tsx",
];

test("homepage hero progressively loads frames without the eager all-frame loop", async () => {
  const source = await read("src/components/ScrollyHero.tsx");
  assert.doesNotMatch(source, /for \(let i = 1; i <= TOTAL_FRAMES; i\+\+\)/);
  assert.match(source, /loadFrame\(0\)/);
  assert.match(source, /requestIdleCallback|getInitialFrameIndices/);
});

test("approved homepage sections, hero copy, and CTAs remain present", async () => {
  const [home, hero] = await Promise.all([
    read("src/app/page.tsx"),
    read("src/components/ScrollyHero.tsx"),
  ]);
  for (const component of [
    "ScrollyHero",
    "StatsBar",
    "RunningManCampaignBanner",
    "TestimonialsMarquee",
    "CircularGallery",
  ]) {
    assert.match(home, new RegExp(component));
  }
  for (const copy of [
    "You think you can't dance.",
    "It's a skill — not a gift.",
    "Let us prove it.",
    "Book a Private Lesson",
    "Meet Ceech",
  ]) {
    assert.ok(hero.includes(copy), `missing approved hero copy: ${copy}`);
  }
});

test("local-business pages use the verified coordinates and stable entity identifier", async () => {
  const sources = await Promise.all(LOCAL_PAGES.map(read));
  for (const source of sources) {
    assert.match(source, /37\.3488633/);
    assert.match(source, /-121\.8944247/);
    assert.doesNotMatch(source, /37\.3382/);
    assert.doesNotMatch(source, /-121\.8863/);
    assert.ok(source.includes('https://dancewithceech.com/#organization'));
  }
  const home = await read("src/app/page.tsx");
  assert.ok(home.includes('https://dancewithceech.com/#organization'));
});

test("college history distinguishes the four employers from guest teaching", async () => {
  const [home, about, sanJose, bayArea] = await Promise.all([
    read("src/app/page.tsx"),
    read("src/app/about/page.tsx"),
    read("src/app/private-lessons/san-jose/page.tsx"),
    read("src/app/private-lessons/bay-area/page.tsx"),
  ]);
  const combined = [home, about, sanJose, bayArea].join("\n");
  for (const employer of [
    "Mission College",
    "West Valley College",
    "Gavilan College",
    "Cabrillo College",
  ]) assert.ok(combined.includes(employer), `missing employer ${employer}`);
  for (const guest of [
    "Stanford",
    "UC Berkeley",
    "UC Santa Cruz",
    "Santa Clara University",
    "De Anza College",
    "San Jose City College",
    "Ohlone College",
  ]) assert.ok(combined.includes(guest), `missing guest institution ${guest}`);
  assert.match(sanJose, /employed by|college faculty|faculty positions/i);
  assert.match(bayArea, /guest taught|guest-teaching|guest instructor/i);

  // Preserve existing teaching-year claims during this scoped factual correction.
  assert.ok(about.includes("25+ Years of Teaching"));
  assert.ok(sanJose.includes("25-year dance instructor"));
  assert.ok(bayArea.includes("25-year Bay Area instructor"));
});

test("private lesson and Running Man pages have descriptive internal links", async () => {
  const [hub, footer, article] = await Promise.all([
    read("src/app/private-lessons/page.tsx"),
    read("src/components/Footer.tsx"),
    read("src/content/posts/hip-hop-dance-move-running-man.md"),
  ]);
  for (const source of [hub, footer]) {
    assert.ok(source.includes('/private-lessons/san-jose'));
    assert.ok(source.includes('/private-lessons/bay-area'));
  }
  assert.ok(article.includes('/running-man-method'));
});

test("Blog, About, and Contact include complete social metadata", async () => {
  for (const path of [
    "src/app/blog/page.tsx",
    "src/app/about/page.tsx",
    "src/app/contact/page.tsx",
  ]) {
    const source = await read(path);
    assert.match(source, /openGraph:/);
    assert.match(source, /twitter:/);
    assert.match(source, /summary_large_image/);
  }
});

test("BeatFirst provides descriptive metadata, crawlable guidance, and WebApplication schema", async () => {
  const source = await read("src/app/beat-first/page.tsx");
  assert.match(source, /WebApplication/);
  assert.match(source, /How BeatFirst works/);
  assert.match(source, /Frequently asked questions/i);
  const description = source.match(/description:\s*['"]([^'"]+)/)?.[1] ?? "";
  assert.ok(description.length >= 120, `BeatFirst description is only ${description.length} characters`);
});

test("the Running Man guide can define a shorter search title", async () => {
  const [postSource, postsLib] = await Promise.all([
    read("src/content/posts/hip-hop-dance-move-running-man.md"),
    read("src/lib/posts.ts"),
  ]);
  assert.match(postSource, /seoTitle:/);
  assert.match(postsLib, /seoTitle\?:/);
  assert.match(postsLib, /data\.seoTitle/);
});

test("both public 30-day programs have canonical and social metadata", async () => {
  for (const path of [
    "src/app/locking-fundamentals-volume-1/page.tsx",
    "src/app/ftl-popping-training-series-volume-1/page.tsx",
  ]) {
    const source = await read(path);
    assert.match(source, /alternates:/);
    assert.match(source, /canonical:/);
    assert.match(source, /openGraph:/);
    assert.match(source, /twitter:/);
  }
});

test("sitemap uses stable route dates and includes both 30-day programs", async () => {
  const source = await read("src/app/sitemap.ts");
  assert.match(source, /STATIC_ROUTE_LAST_MODIFIED/);
  assert.ok(source.includes('/locking-fundamentals-volume-1'));
  assert.ok(source.includes('/ftl-popping-training-series-volume-1'));
  assert.doesNotMatch(source, /lastModified:\s*new Date\(\)/);
  assert.doesNotMatch(source, /:\s*new Date\(\),/);
});

test("Running Man campaign enrollment references remain intact", async () => {
  const [banner, panel, teaser] = await Promise.all([
    read("src/components/RunningManCampaignBanner.tsx"),
    read("src/components/running-man/EnrollmentPanel.tsx"),
    read("src/components/RunningManTeaser.tsx"),
  ]);
  assert.match(banner, /enrollment-state|RunningManTeaser|running-man-method/);
  assert.match(panel, /currentPrice|coaching|checkout/i);
  assert.match(teaser, /running-man-method-teaser\.mp4/);
});
