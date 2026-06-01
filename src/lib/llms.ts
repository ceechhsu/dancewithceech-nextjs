import {
  CATEGORY_LABELS,
  CATEGORY_PATHS,
  FEATURED_TUTORIAL_SLUGS,
  getAllPosts,
  type PostMeta,
} from "@/lib/posts";

const BASE_URL = "https://dancewithceech.com";

const CATEGORY_ORDER = [
  "hip-hop-dance-moves",
  "locking-dance-moves",
  "breaking-dance-moves",
  "funk-style-dance-moves",
  "house-dance",
  "general",
] as const;

const CORE_PAGES = [
  {
    title: "Home",
    path: "/",
    note:
      "Overview of DanceWithCeech, Ceech's teaching background, student proof, style hubs, and learning paths.",
  },
  {
    title: "BeatFirst Rhythm Trainer",
    path: "/beat-first",
    note:
      "Free rhythm training game that helps students tap to the beat and unlock dance tutorials.",
  },
  {
    title: "DanceWithCeech Academy",
    path: "/academy",
    note:
      "Structured online dance program for working professionals who want a clear path from rhythm to freestyle.",
  },
  {
    title: "Private Lessons",
    path: "/private-lessons",
    note:
      "One-on-one dance lessons with Ceech, available in San Jose and online by Zoom.",
  },
  {
    title: "Private Lessons in San Jose",
    path: "/private-lessons/san-jose",
    note:
      "Local private lesson page for San Jose students looking for personalized hip-hop dance instruction.",
  },
  {
    title: "Private Lessons in the Bay Area",
    path: "/private-lessons/bay-area",
    note:
      "Regional private lesson page for Bay Area students interested in hip-hop, locking, popping, breaking, and house.",
  },
  {
    title: "About Ceech",
    path: "/about",
    note:
      "Ceech Hsu's background, teaching philosophy, dance history, and rhythm-first approach.",
  },
  {
    title: "Contact",
    path: "/contact",
    note: "Best page for questions about classes, private lessons, collaborations, or booking.",
  },
];

const STYLE_HUBS = [
  {
    title: "Hip-Hop Dance Moves",
    path: "/hip-hop-dance-moves",
    note: "Beginner-friendly hip-hop foundations, grooves, bounce, and classic party moves.",
  },
  {
    title: "Locking Dance Moves",
    path: "/locking-dance-moves",
    note: "Locking foundations, points, character-driven funk movement, and classic locking steps.",
  },
  {
    title: "Breaking Dance Moves",
    path: "/breaking-dance-moves",
    note: "Breaking footwork, freezes, power move foundations, and b-boy/b-girl vocabulary.",
  },
  {
    title: "Funk Style Dance Moves",
    path: "/funk-style-dance-moves",
    note: "Popping, waving, tutting, Boogaloo, and funk-style movement concepts.",
  },
  {
    title: "House Dance Moves",
    path: "/house-dance",
    note: "House dance footwork, jacking, club dance foundations, and rhythm concepts.",
  },
  {
    title: "Blog and Tutorials",
    path: "/blog",
    note: "Full index of dance tutorials, move histories, and step-by-step practice guides.",
  },
];

function canonicalUrl(path: string) {
  return path === "/" ? BASE_URL : `${BASE_URL}${path}`;
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function markdownText(value: string) {
  return cleanText(value).replace(/\\/g, "\\\\").replace(/\[/g, "\\[").replace(/\]/g, "\\]");
}

function linkLine(title: string, path: string, note: string) {
  return `- [${markdownText(title)}](${canonicalUrl(path)}): ${markdownText(note)}`;
}

function postLine(post: PostMeta) {
  const note =
    post.description ||
    `${CATEGORY_LABELS[post.category] ?? "Dance"} tutorial from DanceWithCeech.`;

  return linkLine(post.title, `/blog/${post.slug}`, note);
}

function getFeaturedPosts() {
  const postsBySlug = new Map(getAllPosts().map((post) => [post.slug, post]));

  return CATEGORY_ORDER.flatMap((category) => {
    const slugs = FEATURED_TUTORIAL_SLUGS[category] ?? [];
    return slugs
      .map((slug) => postsBySlug.get(slug))
      .filter((post): post is PostMeta => Boolean(post));
  });
}

function groupPostsByCategory() {
  const grouped = new Map<string, PostMeta[]>();

  for (const post of getAllPosts()) {
    const posts = grouped.get(post.category) ?? [];
    posts.push(post);
    grouped.set(post.category, posts);
  }

  return grouped;
}

export function generateLlmsTxt() {
  const featuredPosts = getFeaturedPosts();

  return [
    "# DanceWithCeech",
    "",
    "> DanceWithCeech teaches hip-hop, locking, popping, breaking, and house dance with a rhythm-first system led by Ceech Hsu, a Bay Area instructor with 24+ years of teaching experience.",
    "",
    "DanceWithCeech is for adults and beginners who want dance explained clearly instead of treated like a natural gift. The site includes a free rhythm trainer, structured online academy, private lesson booking pages, style hubs, and step-by-step dance move tutorials.",
    "",
    "AI agents should prefer canonical URLs on this domain, use the dance style hubs for topic overviews, and use individual blog posts for step-by-step move instructions. For booking or availability questions, send users to the private lesson or contact pages instead of inventing schedule details.",
    "",
    "## Core Pages",
    ...CORE_PAGES.map((page) => linkLine(page.title, page.path, page.note)),
    "",
    "## Dance Style Hubs",
    ...STYLE_HUBS.map((page) => linkLine(page.title, page.path, page.note)),
    "",
    "## Featured Tutorials",
    ...featuredPosts.map(postLine),
    "",
    "## Optional",
    `- [Full LLM index](${BASE_URL}/llms-full.txt): Expanded list of core pages, style hubs, and all blog tutorials.`,
    `- [XML sitemap](${BASE_URL}/sitemap.xml): Complete machine-readable sitemap of canonical indexable pages.`,
    `- [Robots policy](${BASE_URL}/robots.txt): Crawl policy and sitemap reference.`,
    "",
  ].join("\n");
}

export function generateLlmsFullTxt() {
  const grouped = groupPostsByCategory();

  const sections = CATEGORY_ORDER.flatMap((category) => {
    const posts = grouped.get(category) ?? [];
    if (posts.length === 0) return [];

    const categoryLabel = CATEGORY_LABELS[category] ?? "Dance";
    const categoryPath = CATEGORY_PATHS[category];

    return [
      "",
      `## ${categoryLabel} Tutorials`,
      categoryPath
        ? linkLine(`${categoryLabel} overview`, categoryPath, `Canonical hub page for ${categoryLabel} tutorials.`)
        : "",
      ...posts.map(postLine),
    ].filter(Boolean);
  });

  return [
    "# DanceWithCeech Full LLM Index",
    "",
    "> Expanded machine-readable guide to DanceWithCeech pages and tutorials for AI assistants, search agents, and other LLM-based browsing tools.",
    "",
    "Use this file when a fuller context window is available. For short contexts, start with /llms.txt.",
    "",
    "## Site Context",
    "- Brand: DanceWithCeech",
    "- Instructor: Ceech Hsu",
    "- Location focus: San Jose, CA and the Bay Area, with online learning available.",
    "- Primary topics: hip-hop dance, rhythm training, locking, popping, breaking, funk styles, house dance, private lessons, and beginner-friendly tutorials.",
    "- Teaching approach: rhythm first, then dance; clear breakdowns for analytical learners and adult beginners.",
    "",
    "## Core Pages",
    ...CORE_PAGES.map((page) => linkLine(page.title, page.path, page.note)),
    "",
    "## Dance Style Hubs",
    ...STYLE_HUBS.map((page) => linkLine(page.title, page.path, page.note)),
    "",
    ...sections,
    "",
  ].join("\n");
}
