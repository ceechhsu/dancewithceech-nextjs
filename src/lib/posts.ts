import fs from "fs";
import path from "path";
import matter from "gray-matter";

const POSTS_DIR = path.join(process.cwd(), "src/content/posts");
const IMAGES_DIR = path.join(process.cwd(), "public/images/posts");

export interface PostMeta {
  title: string;
  slug: string;
  date: string;
  category: string;
  description?: string;
  hasImage?: boolean;
}

export interface Post extends PostMeta {
  content: string;
}

export const FEATURED_TUTORIAL_SLUGS: Record<string, string[]> = {
  "hip-hop-dance-moves": [
    "hip-hop-dance-move-running-man",
    "hip-hop-dance-move-roger-rabbit",
    "hip-hop-dance-move-walk-it-out",
  ],
  "locking-dance-moves": [
    "mastering-the-iconic-lock-the-foundation-of-locking-dance",
    "mastering-the-locking-point-a-funky-and-animated-move",
    "master-the-funky-scooby-doo-a-locking-dance-move-with-personality",
  ],
  "breaking-dance-moves": [
    "mastering-the-6-step-the-foundation-of-breakdancing-footwork",
    "mastering-the-freeze-a-fundamental-breaking-move",
    "mastering-the-windmill-the-iconic-b-boy-power-move",
  ],
  "funk-style-dance-moves": [
    "mastering-popping-the-fundamental-move-of-funk-style-dancing",
    "mastering-the-art-of-waving-a-fluid-funk-style-dance-move",
    "mastering-the-art-of-tutting-a-geometric-dance-revolution",
  ],
  "house-dance": [
    "house-dance-jack-in-the-box",
    "house-dance-kriss-kross",
    "house-dance-move-train",
  ],
};

export const CATEGORY_PATHS: Record<string, string> = {
  "hip-hop-dance-moves": "/hip-hop-dance-moves",
  "locking-dance-moves": "/locking-dance-moves",
  "breaking-dance-moves": "/breaking-dance-moves",
  "funk-style-dance-moves": "/funk-style-dance-moves",
  "house-dance": "/house-dance",
  "general": "/blog",
};

export function getAllPosts(): PostMeta[] {
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));

  return files
    .map((filename) => {
      const raw = fs.readFileSync(path.join(POSTS_DIR, filename), "utf-8");
      const { data } = matter(raw);
      const slug = data.slug ?? filename.replace(".md", "");
      return {
        title: data.title ?? "Untitled",
        slug,
        date: data.date ?? "",
        category: data.category ?? "general",
        description: data.description,
        hasImage: fs.existsSync(path.join(IMAGES_DIR, `${slug}.jpg`)),
      };
    })
    .sort((a, b) => (a.date > b.date ? -1 : 1));
}

export function getPostBySlug(slug: string): Post | null {
  const filePath = path.join(POSTS_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);

  const resolvedSlug = data.slug ?? slug;
  return {
    title: data.title ?? "Untitled",
    slug: resolvedSlug,
    date: data.date ?? "",
    category: data.category ?? "general",
    description: data.description,
    hasImage: fs.existsSync(path.join(IMAGES_DIR, `${resolvedSlug}.jpg`)),
    content,
  };
}

export function getFeaturedTutorialsByCategory(): Record<string, PostMeta[]> {
  const posts = getAllPosts();
  const bySlug = new Map(posts.map((post) => [post.slug, post]));

  return Object.fromEntries(
    Object.entries(FEATURED_TUTORIAL_SLUGS).map(([category, slugs]) => [
      category,
      slugs.map((slug) => bySlug.get(slug)).filter((post): post is PostMeta => Boolean(post)),
    ])
  );
}

export function getRelatedPosts(post: PostMeta, limit = 3): PostMeta[] {
  const preferredSlugs = FEATURED_TUTORIAL_SLUGS[post.category] ?? [];
  const posts = getAllPosts().filter(
    (candidate) => candidate.category === post.category && candidate.slug !== post.slug
  );
  const preferred = preferredSlugs
    .filter((slug) => slug !== post.slug)
    .map((slug) => posts.find((candidate) => candidate.slug === slug))
    .filter((candidate): candidate is PostMeta => Boolean(candidate));
  const remaining = posts.filter(
    (candidate) => !preferred.some((preferredPost) => preferredPost.slug === candidate.slug)
  );

  return [...preferred, ...remaining].slice(0, limit);
}

export const CATEGORY_LABELS: Record<string, string> = {
  "hip-hop-dance-moves": "Hip-Hop",
  "locking-dance-moves": "Locking",
  "breaking-dance-moves": "Breaking",
  "funk-style-dance-moves": "Funk & Popping",
  "house-dance": "House Dance",
  "general": "General",
};
