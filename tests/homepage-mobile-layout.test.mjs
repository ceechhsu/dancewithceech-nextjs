import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const siteRoot = path.resolve(import.meta.dirname, "..");

test("homepage stats use a two-column mobile grid and four-column desktop grid", () => {
  const source = fs.readFileSync(path.join(siteRoot, "src/components/StatsBar.tsx"), "utf8");
  assert.match(source, /grid-cols-2/);
  assert.match(source, /sm:grid-cols-4/);
});

test("Mindtricks story image is positioned toward the top of the frame", () => {
  const source = fs.readFileSync(path.join(siteRoot, "src/app/page.tsx"), "utf8");
  const imageBlock = source.slice(source.indexOf('src="/images/ceech/mindtricks-dance-group-photo.jpg"'), source.indexOf("/>\n              <div", source.indexOf('src="/images/ceech/mindtricks-dance-group-photo.jpg"')));
  assert.match(imageBlock, /objectPosition:\s*["']center 20%["']/);
});
