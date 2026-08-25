import { MetadataRoute } from 'next'
import { getAllPosts } from '@/lib/posts'

const BASE_URL = 'https://dancewithceech.com'

const STATIC_ROUTE_LAST_MODIFIED: Record<string, string> = {
  '/': '2026-08-24',
  '/academy': '2026-05-11',
  '/running-man-method': '2026-08-22',
  '/beat-first': '2026-08-24',
  '/private-lessons': '2026-08-24',
  '/private-lessons/san-jose': '2026-08-24',
  '/private-lessons/bay-area': '2026-08-24',
  '/blog': '2026-08-24',
  '/hip-hop-dance-moves': '2026-05-11',
  '/locking-dance-moves': '2026-05-11',
  '/breaking-dance-moves': '2026-05-11',
  '/funk-style-dance-moves': '2026-05-11',
  '/house-dance': '2026-05-19',
  '/about': '2026-08-24',
  '/contact': '2026-08-24',
  '/locking-fundamentals-volume-1': '2026-08-24',
  '/ftl-popping-training-series-volume-1': '2026-08-24',
}

const route = (
  path: string,
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'],
  priority: number
): MetadataRoute.Sitemap[number] => ({
  url: `${BASE_URL}${path === '/' ? '' : path}`,
  lastModified: STATIC_ROUTE_LAST_MODIFIED[path],
  changeFrequency,
  priority,
})

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts()

  const staticRoutes: MetadataRoute.Sitemap = [
    route('/', 'weekly', 1),
    route('/academy', 'monthly', 0.9),
    route('/running-man-method', 'weekly', 0.9),
    route('/beat-first', 'monthly', 0.9),
    route('/private-lessons', 'monthly', 0.9),
    route('/private-lessons/san-jose', 'monthly', 0.8),
    route('/private-lessons/bay-area', 'monthly', 0.8),
    route('/blog', 'weekly', 0.8),
    route('/hip-hop-dance-moves', 'weekly', 0.8),
    route('/locking-dance-moves', 'weekly', 0.8),
    route('/breaking-dance-moves', 'weekly', 0.8),
    route('/funk-style-dance-moves', 'weekly', 0.8),
    route('/house-dance', 'weekly', 0.8),
    route('/about', 'monthly', 0.6),
    route('/contact', 'monthly', 0.5),
    route('/locking-fundamentals-volume-1', 'monthly', 0.7),
    route('/ftl-popping-training-series-volume-1', 'monthly', 0.7),
  ]

  const postRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: post.date || undefined,
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  return [...staticRoutes, ...postRoutes]
}
