import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("retired offer permanently redirects to the instructional article", async () => {
  const redirects = JSON.parse(await read("src/content/redirects.json"));
  assert.equal(redirects.find(r => r.source === "/running-man-method")?.destination, "/blog/hip-hop-dance-move-running-man");
  assert.match(await read("next.config.ts"), /redirectsJson\.map[\s\S]*?permanent: true/);
});

test("sitemap excludes the retired offer and still includes blog posts", async () => {
  const sitemap = await read("src/app/sitemap.ts");
  assert.doesNotMatch(sitemap, /running-man-method/);
  assert.match(sitemap, /getAllPosts\(\)/);
});

test("Running Man article retains teaching and history without the class pitch", async () => {
  const article = await read("src/content/posts/hip-hop-dance-move-running-man.md");
  assert.match(article, /## Build the rhythm before the variations/);
  assert.match(article, /Make both feet arrive together/);
  assert.match(article, /### How long does it take to learn the Running Man/);
  assert.doesNotMatch(article, /running-man-method|four-week Running Man Method/);
});
