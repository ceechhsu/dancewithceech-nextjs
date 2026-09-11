import type { PostMeta } from './posts';

export const TOPICS = { all: 'All Articles', learn: 'Learn to Dance', wellbeing: 'Dance & Wellbeing', stories: 'Stories & Community' } as const;
export type BlogTopic = keyof typeof TOPICS;
export const STYLES = { 'hip-hop-dance-moves': 'Hip-Hop', 'locking-dance-moves': 'Locking', 'breaking-dance-moves': 'Breaking', 'funk-style-dance-moves': 'Popping & Funk', 'house-dance': 'House' } as const;
export type DanceStyle = keyof typeof STYLES;
export function getBlogStyle(post: Pick<PostMeta, 'category'>): DanceStyle | null {
  return Object.hasOwn(STYLES, post.category) ? post.category as DanceStyle : null;
}
export function getBlogStyleLabel(post: Pick<PostMeta, 'category'>): string | null {
  const style = getBlogStyle(post);
  return style ? STYLES[style] : null;
}
export const WELLNESS_SLUG = 'groove-to-wellness-unlocking-the-mental-benefits-of-dance-in-the-bay-area-2024';
export const FEATURED = [WELLNESS_SLUG, 'hip-hop-dance-move-running-man', 'how-krazy-deals-started'];
export const MORE = ['mastering-the-art-of-waving-a-fluid-funk-style-dance-move', 'i-almost-quit-dancing', '2023-spring-dance-showcase-at-west-valley-mission-college'];
const learningAdvice = new Set(['i-almost-quit-dancing', 'reality-hits-you-in-the-face', '3-reasons-why-private-lessons-works']);
const wellbeing = new Set([WELLNESS_SLUG, 'dancing-increases-your-lifespan']);

export function getBlogTopic(post: PostMeta): Exclude<BlogTopic, 'all'> {
  if (wellbeing.has(post.slug)) return 'wellbeing';
  if (post.category !== 'general' || learningAdvice.has(post.slug)) return 'learn';
  return 'stories';
}
export type BlogQuery = { topic: BlogTopic; style: string; q: string; page: number };
export function readBlogQuery(params: Record<string, string | string[] | undefined>): BlogQuery {
  const first = (key: string) => { const v = params[key]; return Array.isArray(v) ? v[0] ?? '' : v ?? ''; };
  const topic = Object.hasOwn(TOPICS, first('topic')) ? first('topic') as BlogTopic : 'all';
  const page = Number(first('page'));
  return { topic, style: topic === 'learn' && Object.hasOwn(STYLES, first('style')) ? first('style') : '', q: first('q').trim().slice(0, 200), page: Number.isSafeInteger(page) && page > 0 ? page : 1 };
}
export function filterBlogPosts(posts: PostMeta[], query: Pick<BlogQuery, 'topic' | 'style' | 'q'>) {
  const terms = query.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return posts.filter(post => {
    const haystack = `${post.title} ${post.description ?? ''} ${post.category} ${TOPICS[getBlogTopic(post)]}`.toLowerCase();
    return (query.topic === 'all' || getBlogTopic(post) === query.topic) && (!query.style || post.category === query.style) && terms.every(term => haystack.includes(term));
  });
}
export function blogHref(query: Partial<BlogQuery> = {}) {
  const params = new URLSearchParams({ view: 'all' });
  if (query.topic && query.topic !== 'all') params.set('topic', query.topic);
  if (query.style) params.set('style', query.style);
  if (query.q) params.set('q', query.q);
  if (query.page && query.page > 1) params.set('page', String(query.page));
  return `/blog?${params.toString()}`;
}
export function blogDate(value: string) {
  const date = new Date(`${value.slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(date.valueOf()) ? '' : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(date);
}
const displayTitles: Record<string, string> = {
  [WELLNESS_SLUG]: 'The Mental Benefits of Dance',
  'hip-hop-dance-move-running-man': 'Learn the Running Man',
  'how-krazy-deals-started': 'How Dance Community Inspired Krazy.Deals',
  [MORE[0]]: 'Your First Arm Wave',
  [MORE[1]]: 'Why I Almost Quit Dancing',
  [MORE[2]]: 'A College Dance Showcase',
};
export function blogTitle(post: PostMeta) { return displayTitles[post.slug] ?? post.title; }
export function blogImage(post: PostMeta) {
  return post.slug === 'how-krazy-deals-started' ? '/images/ceech/rimini-gary-ceech.webp' : post.hasImage ? `/images/posts/${post.slug}.jpg` : null;
}
