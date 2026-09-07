import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageUrl = process.env.DOLPHIN_DIVE_URL ?? "http://localhost:3001/blog/dolphin-dive";
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

async function getPageHtml(t) {
  try {
    const response = await fetch(pageUrl);
    assert.equal(response.status, 200);
    return response.text();
  } catch (error) {
    if (error?.cause?.code === "ECONNREFUSED" || error?.cause?.code === "EPERM") {
      t.skip(`Dolphin Dive integration service is not running at ${pageUrl}`);
      return null;
    }
    throw error;
  }
}

function getJsonLd(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((match) => JSON.parse(match[1]));
}

test("Dolphin Dive belongs to the House Dance topic cluster", async (t) => {
  const html = await getPageHtml(t); if (!html) return;
  assert.match(html, /href="\/house-dance"[^>]*>House Dance<\/a>/);
  assert.match(html, /More (?:<!-- -->)?House Dance(?:<!-- -->)? tutorials/);
  assert.doesNotMatch(html, /More Hip-Hop tutorials/);
  assert.match(html, /href="https:\/\/dancewithceech\.com\/house-dance"[^>]*>House Dance<\/a>/);
});

test("smooth Dolphin Dive is targeted naturally in a question H2", async (t) => {
  const html = await getPageHtml(t); if (!html) return;
  assert.match(html, /<h2>How do you make a smooth Dolphin Dive\?<\/h2>/);
});

test("the search snippet targets smooth Dolphin Dive without changing the visible H1", async (t) => {
  const html = await getPageHtml(t); if (!html) return;
  assert.match(html, /<title>Smooth Dolphin Dive Dance: Step-by-Step Tutorial<\/title>/);
  assert.match(html, /<meta name="description" content="Learn a smooth Dolphin Dive dance with Caleaf’s demonstration, strength-first technique, four-beat timing, and corrections that prevent hard landings\."\/>/);
  assert.match(html, /<h1[^>]*>Dolphin Dive Dance: How to Do It Smoothly<\/h1>/);
});

test("the demonstration label and yoga comparison are precise", async (t) => {
  const html = await getPageHtml(t); if (!html) return;
  assert.match(html, /<iframe[^>]+title="Dolphin Dive demonstration by Caleaf Sellers"/);
  assert.match(html, /resembles an Upward-Facing Dog shape through the head, chest, and straight arms, but it is not the complete yoga pose/);
});

test("the article displays Ceech authorship and both publication dates", async (t) => {
  const html = await getPageHtml(t); if (!html) return;
  assert.match(html, /href="\/about"[^>]*>By Ceech<\/a>/);
  assert.match(html, /Published (?:<!-- -->)?May 13, 2024/);
  assert.match(html, /Updated (?:<!-- -->)?September 6, 2026/);
});

test("BlogPosting schema identifies the author and modification date", async (t) => {
  const html = await getPageHtml(t); if (!html) return;
  const schemas = getJsonLd(html);
  const article = schemas.find((schema) => schema["@type"] === "BlogPosting");
  assert.ok(article);
  assert.equal(article.author.url, "https://dancewithceech.com/about");
  assert.equal(article.dateModified, "2026-09-06T12:16:58-07:00");
});

test("the verified YouTube demonstration has VideoObject schema", async (t) => {
  const html = await getPageHtml(t); if (!html) return;
  const schemas = getJsonLd(html);
  const video = schemas.find((schema) => schema["@type"] === "VideoObject");
  assert.ok(video);
  assert.equal(video.name, "Hip Hop Dance Move - Dolphin Dive");
  assert.equal(video.uploadDate, "2024-05-10");
  assert.equal(video.duration, "PT44S");
  assert.equal(video.embedUrl, "https://www.youtube.com/embed/2ScBJ-zBMwM");
  assert.equal(video.thumbnailUrl, "https://i.ytimg.com/vi/2ScBJ-zBMwM/maxresdefault.jpg");
});

test("the hero and embedded video use responsive loading behavior", async (t) => {
  const html = await getPageHtml(t); if (!html) return;
  assert.match(html, /<img[^>]+alt="Caleaf Sellers demonstrating the Dolphin Dive dance floor move"[^>]+srcSet="[^"]*_next\/image/);
  assert.match(html, /<iframe[^>]+loading="lazy"[^>]+youtube\.com\/embed\/2ScBJ-zBMwM/);
});

test("markdown tables expose labels for stacked mobile correction cards", async (t) => {
  const [html, css] = await Promise.all([
    getPageHtml(t),
    read("src/app/globals.css"),
  ]);
  if (!html) return;
  assert.match(html, /<td data-label="What you notice">/);
  assert.match(html, /<td data-label="Likely issue">/);
  assert.match(html, /<td data-label="What to correct">/);
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /content:\s*attr\(data-label\)/);
});
