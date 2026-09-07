import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const siteRoot = path.resolve(import.meta.dirname, "..");

test("priority commercial pages use intent-aligned SEO metadata", () => {
  const expectations = {
    "src/app/private-lessons/page.tsx": {
      title: "Private Hip-Hop Dance Lessons in San Jose | DanceWithCeech",
      description: "Book private hip-hop dance lessons with Ceech in San Jose or online. Get personalized feedback, real-time corrections, and a clear practice plan.",
    },
    "src/app/running-man-method/page.tsx": {
      title: "Learn the Running Man | 4-Week Online Cohort | Ceech",
      description: "Join Ceech's four-week online beginner cohort to learn the Running Man through progressive drills, personal feedback, and live practice.",
    },
    "src/app/private-lessons/san-jose/page.tsx": {
      title: "Hip-Hop Dance Lessons in San Jose | DanceWithCeech",
      description: "Book private hip-hop dance lessons in San Jose with Ceech at Get Down Dance Studios. Beginner-friendly coaching, personal feedback, and a free consultation.",
    },
    "src/app/private-lessons/bay-area/page.tsx": {
      title: "Bay Area Hip-Hop Dance Lessons | DanceWithCeech",
      description: "Find private hip-hop dance lessons for Bay Area adults, in person in San Jose or online. Train with Ceech through clear foundations and personal feedback.",
    },
    "src/app/blog/page.tsx": {
      title: "Hip-Hop Dance Tutorials & Move Guides | DanceWithCeech",
      description: "Learn hip-hop, locking, popping, breaking, and house dance with step-by-step tutorials, move breakdowns, and practice tips from Ceech.",
    },
    "src/app/about/page.tsx": {
      title: "About Ceech | Hip-Hop Dance Instructor | DanceWithCeech",
      description: "Meet Ceech, a UC Berkeley engineer turned hip-hop dance educator with 25+ years of experience teaching adults through clear, progressive training.",
    },
    "src/app/contact/page.tsx": {
      title: "Contact Ceech | San Jose Dance Lessons | DanceWithCeech",
      description: "Contact Ceech about private hip-hop lessons, online dance training, or classes at Get Down Dance Studios in San Jose, California.",
    },
    "src/app/locking-fundamentals-volume-1/page.tsx": {
      title: "30-Day Locking Fundamentals for Beginners | Ceech",
      description: "Learn locking from the ground up in a 30-day beginner program covering The Lock, Wrist Twirl, Point, and Five through progressive practice.",
    },
  };

  for (const [relativePath, metadata] of Object.entries(expectations)) {
    const source = fs.readFileSync(path.join(siteRoot, relativePath), "utf8");
    assert.ok(source.includes(`title: "${metadata.title}"`) || source.includes(`title: '${metadata.title}'`), `${relativePath} should have the approved title`);
    assert.ok(source.includes(`description: "${metadata.description}"`) || source.includes(`description: '${metadata.description}'`), `${relativePath} should have the approved description`);
  }
});

test("every blog SEO title stays within the concise search-result target", () => {
  const postsDirectory = path.join(siteRoot, "src/content/posts");
  const overlongTitles = [];

  for (const filename of fs.readdirSync(postsDirectory).filter((name) => name.endsWith(".md"))) {
    const source = fs.readFileSync(path.join(postsDirectory, filename), "utf8");
    const { data } = matter(source);
    const seoTitle = data.seoTitle ?? `${data.title} — DanceWithCeech`;

    if (seoTitle.length > 60) {
      overlongTitles.push(`${filename}: ${seoTitle.length} characters`);
    }
  }

  assert.deepEqual(overlongTitles, [], `blog SEO titles are still over 60 characters:\n${overlongTitles.join("\n")}`);
});

test("every blog meta description stays within the concise snippet target", () => {
  const postsDirectory = path.join(siteRoot, "src/content/posts");
  const overlongDescriptions = [];

  for (const filename of fs.readdirSync(postsDirectory).filter((name) => name.endsWith(".md"))) {
    const source = fs.readFileSync(path.join(postsDirectory, filename), "utf8");
    const { data } = matter(source);

    if (data.description?.length > 160) {
      overlongDescriptions.push(`${filename}: ${data.description.length} characters`);
    }
  }

  assert.deepEqual(overlongDescriptions, [], `blog meta descriptions are still over 160 characters:\n${overlongDescriptions.join("\n")}`);
});
