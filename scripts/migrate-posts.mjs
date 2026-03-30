/**
 * WordPress XML → Markdown migration script
 * Run: node scripts/migrate-posts.mjs
 *
 * Parses all_posts.xml, strips Divi shortcodes, converts HTML to markdown,
 * and writes one .md file per post into src/content/posts/
 */

import { readFileSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const XML_PATH = "/Volumes/ACASIS4T/DanceWithCeech.com/Backups/all_posts.xml";
const OUT_DIR = join(ROOT, "src/content/posts");

mkdirSync(OUT_DIR, { recursive: true });

// --- Helpers ---

function extractCdata(str) {
  const m = str.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  return m ? m[1].trim() : str.trim();
}

function stripDiviShortcodes(content) {
  // Remove Divi builder shortcode wrappers but keep inner HTML
  return content
    .replace(/\[et_pb_[^\]]*\]/g, "")
    .replace(/\[\/et_pb_[^\]]*\]/g, "")
    .trim();
}

function htmlToMarkdown(html) {
  return html
    // Headings
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n")
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n")
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n")
    .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "\n#### $1\n")
    // Bold / italic
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**")
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**")
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "*$1*")
    .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "*$1*")
    // Links
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)")
    // Images
    .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, "![$2]($1)")
    .replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, "![]($1)")
    // Lists
    .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, inner) =>
      inner.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n")
    )
    .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, inner) => {
      let i = 1;
      return inner.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, () => `${i++}. $1\n`);
    })
    // Paragraphs and line breaks
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n$1\n")
    .replace(/<br\s*\/?>/gi, "\n")
    // Blockquotes
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, "\n> $1\n")
    // Strip remaining tags
    .replace(/<[^>]+>/g, "")
    // Decode HTML entities
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&nbsp;/g, " ")
    // Clean up excessive blank lines
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function mapCategory(nicenames) {
  if (nicenames.includes("breaking-dance-moves") || nicenames.includes("breaking")) return "breaking-dance-moves";
  if (nicenames.includes("locking-dance-moves") || nicenames.includes("locking")) return "locking-dance-moves";
  if (nicenames.includes("funk-style") || nicenames.includes("funk-style-dance-move")) return "funk-style-dance-moves";
  if (nicenames.includes("house-dance")) return "house-dance";
  if (nicenames.includes("hip-hop-dance-moves") || nicenames.includes("hip-hop-dance-move")) return "hip-hop-dance-moves";
  return "general";
}

// --- Parse XML ---

const xml = readFileSync(XML_PATH, "utf-8");

// Split into items
const itemRegex = /<item>([\s\S]*?)<\/item>/g;
let match;
let count = 0;
const redirects = [];

while ((match = itemRegex.exec(xml)) !== null) {
  const item = match[1];

  // Only published posts
  const postType = extractCdata(item.match(/<wp:post_type>([\s\S]*?)<\/wp:post_type>/)?.[1] ?? "");
  const status = extractCdata(item.match(/<wp:status>([\s\S]*?)<\/wp:status>/)?.[1] ?? "");
  if (postType !== "post" || status !== "publish") continue;

  const title = extractCdata(item.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "Untitled");
  const slug = extractCdata(item.match(/<wp:post_name>([\s\S]*?)<\/wp:post_name>/)?.[1] ?? slugify(title));
  const date = extractCdata(item.match(/<wp:post_date>([\s\S]*?)<\/wp:post_date>/)?.[1] ?? "");
  const rawContent = extractCdata(item.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/)?.[1] ?? "");
  const link = item.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() ?? "";

  // Categories
  const catMatches = [...item.matchAll(/nicename="([^"]*)"/g)].map(m => m[1]);
  const category = mapCategory(catMatches);

  // Clean content
  const strippedContent = stripDiviShortcodes(rawContent);
  const markdownContent = htmlToMarkdown(strippedContent);

  if (!markdownContent || markdownContent.length < 10) continue;

  // Build frontmatter
  const frontmatter = [
    "---",
    `title: "${title.replace(/"/g, '\\"')}"`,
    `slug: "${slug}"`,
    `date: "${date}"`,
    `category: "${category}"`,
    "---",
    "",
  ].join("\n");

  const mdFilename = `${slug}.md`;
  writeFileSync(join(OUT_DIR, mdFilename), frontmatter + markdownContent + "\n");

  // Track redirect: old WordPress URL → new Next.js URL
  if (link) {
    const oldPath = new URL(link).pathname;
    const newPath = `/blog/${slug}`;
    if (oldPath !== newPath) {
      redirects.push({ source: oldPath, destination: newPath });
    }
  }

  count++;
}

console.log(`✅ Migrated ${count} posts to ${OUT_DIR}`);

// Write redirects to next.config.ts compatible JSON
const redirectsPath = join(ROOT, "src/content/redirects.json");
writeFileSync(redirectsPath, JSON.stringify(redirects, null, 2));
console.log(`✅ Wrote ${redirects.length} redirects to src/content/redirects.json`);
