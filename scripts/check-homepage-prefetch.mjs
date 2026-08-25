import fs from "node:fs";

const page = fs.readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");

function assertPrefetchDisabled(anchor, label) {
  if (!anchor.includes("prefetch={false}")) {
    throw new Error(`${label} is missing prefetch={false}.`);
  }
}

const categoryStart = page.indexOf('href={CATEGORY_PATHS[category] ?? "/blog"}');
const articleStart = page.indexOf("href={`/blog/${post.slug}`}");

if (categoryStart < 0) throw new Error("Could not find the homepage category link.");
if (articleStart < 0) throw new Error("Could not find the homepage article link.");

assertPrefetchDisabled(page.slice(categoryStart - 120, categoryStart + 220), "Homepage category link");
assertPrefetchDisabled(page.slice(articleStart - 160, articleStart + 220), "Homepage article link");
console.log("Homepage article and category links disable automatic prefetching.");
