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

export const CATEGORY_LABELS: Record<string, string> = {
  "hip-hop-dance-moves": "Hip-Hop",
  "locking-dance-moves": "Locking",
  "breaking-dance-moves": "Breaking",
  "funk-style-dance-moves": "Funk & Popping",
  "house-dance": "House Dance",
  "general": "General",
};
