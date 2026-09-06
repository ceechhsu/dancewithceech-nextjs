import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const siteRoot = path.resolve(import.meta.dirname, "..");

test("blog image templates provide meaningful alt text", () => {
  const listing = fs.readFileSync(path.join(siteRoot, "src/app/blog/page.tsx"), "utf8");
  const article = fs.readFileSync(path.join(siteRoot, "src/app/blog/[slug]/page.tsx"), "utf8");

  assert.match(listing, /src=\{`\/images\/posts\/\$\{post\.slug\}\.jpg`\}[\s\S]{0,120}alt=\{post\.title\}/);
  assert.match(article, /src=\{`\/images\/posts\/\$\{post\.slug\}\.jpg`\}[\s\S]{0,120}alt=\{post\.imageAlt \?\? post\.title\}/,
    "article images should use the specific frontmatter description with the title as a fallback");
});

test("canvas hero imagery exposes an accessible image equivalent", () => {
  const source = fs.readFileSync(path.join(siteRoot, "src/components/ScrollyHero.tsx"), "utf8");
  assert.match(source, /<canvas[\s\S]{0,500}role="img"[\s\S]{0,500}aria-label="[^"]+"/, 
    "the canvas hero should expose an accessible label for its visual content");
});

test("homepage images provide meaningful title attributes for SEOwallet", () => {
  const homepage = fs.readFileSync(path.join(siteRoot, "src/app/page.tsx"), "utf8");
  const nav = fs.readFileSync(path.join(siteRoot, "src/components/Nav.tsx"), "utf8");

  assert.match(nav, /src="\/logo-mark\.png"[\s\S]{0,120}title="DanceWithCeech logo"/);
  assert.match(homepage, /dsplayers-performing-americas-got-talent\.jpg[\s\S]{0,180}title="DS Players performing on America's Got Talent in 2010"/);
  assert.match(homepage, /mindtricks-dance-group-photo\.jpg[\s\S]{0,180}title="Mindtricks dance group with future Jabbawockeez founders"/);
  assert.match(homepage, /dsplayers-2006-body-rock-winners\.jpg[\s\S]{0,180}title="DS Players Body Rock dance competition winners"/);

  assert.match(homepage, /title=\{`\$\{name\} dance style`\}/);
});

test("meaningful site images provide title attributes for SEOwallet", () => {
  const files = [
    "src/app/about/page.tsx",
    "src/app/blog/page.tsx",
    "src/app/blog/[slug]/page.tsx",
    "src/app/breaking-dance-moves/page.tsx",
    "src/app/ftl-popping-training-series-volume-1/page.tsx",
    "src/app/funk-style-dance-moves/page.tsx",
    "src/app/hip-hop-dance-moves/page.tsx",
    "src/app/house-dance/page.tsx",
    "src/app/links/LinksContent.tsx",
    "src/app/locking-dance-moves/page.tsx",
    "src/app/locking-fundamentals-volume-1/page.tsx",
    "src/app/private-lessons/page.tsx",
    "src/app/running-man-method/RunningManMethodPage.tsx",
    "src/components/ui/circular-testimonials.tsx",
    "src/components/ui/stories-carousel.tsx",
    "src/components/UserMenu.tsx",
  ];

  for (const relativePath of files) {
    const source = fs.readFileSync(path.join(siteRoot, relativePath), "utf8");
    const tags = [...source.matchAll(/<(?:Image|img)[^>]*>/gs)].map(([tag]) => tag);
    const meaningfulTags = tags.filter((tag) => (
      !/alt\s*=\s*(?:["']{2}|\{["']{2}\})/.test(tag) &&
      !/aria-hidden=["']true["']/.test(tag)
    ));
    assert.ok(meaningfulTags.length > 0, `${relativePath} should contain a meaningful image`);
    for (const tag of meaningfulTags) {
      assert.match(tag, /\btitle=/, `${relativePath} has a meaningful image without a title`);
    }
  }
});

test("homepage testimonial thumbnails provide descriptive alt text", () => {
  const source = fs.readFileSync(path.join(siteRoot, "src/components/ui/circular-gallery.tsx"), "utf8");
  assert.match(source, /src=\{`https:\/\/i\.ytimg\.com\/vi\/\$\{item\.videoId\}\/hqdefault\.jpg`\}/);
  assert.match(source, /alt=\{`Student testimonial video \$\{i \+ 1\}`\}/,
    "testimonial thumbnails should not use empty alt text");
});

test("identified site images use descriptive filenames", () => {
  const imageDirectory = path.join(siteRoot, "public/images/ceech");
  const renamedImages = [
    "ceech-smiling-portrait.jpg",
    "ceech-dance-pose-get-down-studio.jpg",
    "ceech-derby-dance-pose.jpg",
    "ceech-teaching-private-student-neck-control.jpg",
    "ceech-samy-popping-arm-drill.jpg",
    "ceech-samy-teaching-knee-pop.jpg",
    "ceech-teaching-running-man-adult-class.jpg",
    "ceech-teaching-adult-dance-class.jpg",
    "dsplayers-performing-americas-got-talent.jpg",
    "dsplayers-2006-body-rock-winners.jpg",
    "mindtricks-dance-group-photo.jpg",
    "calistyles-members-before-uc-santa-cruz-performance.jpg",
    "ceech-thinking-dance-pose.jpg",
  ];

  for (const filename of renamedImages) {
    assert.ok(fs.existsSync(path.join(imageDirectory, filename)), `${filename} should exist`);
  }

  assert.ok(fs.existsSync(path.join(siteRoot, "public/images/posts/steve-martin-dance-tutorial-cover.jpg")), "Steve Martin cover should exist");
});

test("renamed image URLs have permanent redirects", () => {
  const source = fs.readFileSync(path.join(siteRoot, "next.config.ts"), "utf8");
  const redirects = {
    "/images/ceech/dsp-agt.jpg": "/images/ceech/dsplayers-performing-americas-got-talent.jpg",
    "/images/ceech/mindtricks.jpg": "/images/ceech/mindtricks-dance-group-photo.jpg",
    "/images/ceech/bodyrockwinner.jpg": "/images/ceech/dsplayers-2006-body-rock-winners.jpg",
    "/images/ceech/thinking.jpg": "/images/ceech/ceech-thinking-dance-pose.jpg",
    "/images/ceech/Teaching-Neck-1-sm.jpg": "/images/ceech/ceech-teaching-private-student-neck-control.jpg",
    "/images/ceech/calistyles.jpg": "/images/ceech/calistyles-members-before-uc-santa-cruz-performance.jpg",
    "/images/ceech/hat-off-pose.jpg": "/images/ceech/ceech-derby-dance-pose.jpg",
    "/images/ceech/ceech-mirror.jpg": "/images/ceech/ceech-dance-pose-get-down-studio.jpg",
    "/images/ceech/portrait-smile-small.jpg": "/images/ceech/ceech-smiling-portrait.jpg",
    "/images/ceech/popping-arms.jpg": "/images/ceech/ceech-samy-popping-arm-drill.jpg",
    "/images/ceech/teaching-knee-pop.jpg": "/images/ceech/ceech-samy-teaching-knee-pop.jpg",
    "/images/ceech/running-man-method-class.jpg": "/images/ceech/ceech-teaching-running-man-adult-class.jpg",
    "/images/ceech/group-class.jpg": "/images/ceech/ceech-teaching-adult-dance-class.jpg",
    "/images/posts/1845-2.jpg": "/images/posts/steve-martin-dance-tutorial-cover.jpg",
  };

  for (const [from, to] of Object.entries(redirects)) {
    assert.ok(source.includes(`["${from}", "${to}"]`), `${from} should redirect to ${to}`);
  }
});

test("largest local images have WebP versions and use them in references", () => {
  const imageDirectory = path.join(siteRoot, "public/images/ceech");
  const optimizedImages = [
    "rimini-gary-ceech.webp",
    "ceech-teaching-running-man-adult-class.webp",
    "ceech-teaching-adult-dance-class.webp",
  ];

  for (const filename of optimizedImages) {
    assert.ok(fs.existsSync(path.join(imageDirectory, filename)), `${filename} should exist`);
  }

  const referenceFiles = [
    "src/app/page.tsx",
    "src/app/about/page.tsx",
    "src/app/academy/page.tsx",
    "src/app/running-man-method/page.tsx",
    "src/app/running-man-method/RunningManMethodPage.tsx",
    "src/content/posts/how-krazy-deals-started.md",
  ];
  const combinedSource = referenceFiles
    .map((relativePath) => fs.readFileSync(path.join(siteRoot, relativePath), "utf8"))
    .join("\n");

  for (const filename of optimizedImages.filter(name => name !== "ceech-teaching-adult-dance-class.webp")) {
    assert.ok(combinedSource.includes(filename), `${filename} should be referenced by the site`);
  }
  // The adult-class photo belonged to the retired Academy offer. Keep the
  // optimized asset recoverable without requiring an unrelated public placement.
  const archive = fs.readFileSync(path.join(siteRoot, "docs/archive/academy-2026-09-05/src__components__AcademyWaitlist.tsx.txt"), "utf8");
  assert.ok(archive.includes("ceech-teaching-adult-dance-class.webp"));
});
