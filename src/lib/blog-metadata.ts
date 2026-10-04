import { blogHref, filterBlogPosts, readBlogQuery } from './blog-library';
import type { PostMeta } from './posts';

type SearchParams = Record<string, string | string[] | undefined>;
const base = 'https://dancewithceech.com';

// Match BlogLibrary's page clamp without changing the visible library.
export function blogMetadata(params: SearchParams, posts: PostMeta[]) {
  const query = readBlogQuery(params);
  const count = filterBlogPosts(posts, query).length;
  const pages = Math.max(1, Math.ceil(count / 12));
  const page = Math.min(query.page, pages);
  const overview = !params.view && !query.q && query.topic === 'all' && query.page === 1;
  // Preserve the existing search canonical policy. Empty results also retain
  // the base canonical rather than introducing more canonical query URLs.
  const canonical = base + (overview || query.q || count === 0 ? '/blog' : blogHref({ ...query, page }));
  return { alternates: { canonical }, canonical };
}
