import Link from 'next/link';
import Image from 'next/image';
import { Search, ArrowRight } from 'lucide-react';
import type { PostMeta } from '@/lib/posts';
import { TOPICS, STYLES, FEATURED, MORE, getBlogTopic, getBlogStyleLabel, blogTitle, blogImage, blogDate, blogHref, filterBlogPosts, type BlogQuery, type BlogTopic } from '@/lib/blog-library';
import styles from './BlogLibrary.module.css';

function Article({ post, variant = 'card' }: { post: PostMeta; variant?: 'lead' | 'support' | 'small' | 'card' }) {
  const image = blogImage(post);
  const topic = getBlogTopic(post);
  const styleLabel = topic === 'learn' ? getBlogStyleLabel(post) : null;
  return <article className={`${styles.article} ${styles[variant]}`}>
    <Link href={`/blog/${post.slug}`} prefetch={false} className={styles.articleLink}>
      {image && <div className={styles.image}><Image src={image} alt={post.imageAlt ?? blogTitle(post)} title={post.imageAlt ?? blogTitle(post)} width={800} height={450} sizes={variant === 'lead' ? '(min-width: 900px) 50vw, 100vw' : variant === 'support' || variant === 'small' ? '(min-width: 600px) 230px, 35vw' : '(min-width: 900px) 33vw, (min-width: 600px) 50vw, 100vw'} priority={variant === 'lead'} /></div>}
      <div className={styles.copy}>
        <div className={styles.meta}><span className={styles.topic}>{styleLabel ?? TOPICS[topic]}</span><time dateTime={(post.updated || post.date).slice(0, 10)}>{post.updated ? 'Updated ' : ''}{blogDate(post.updated || post.date)}</time></div>
        <h3>{blogTitle(post)}</h3>
        {post.description && <p>{post.description}</p>}
        {styleLabel && <span className={styles.tag}>Learn to Dance</span>}
      </div>
    </Link>
  </article>;
}

export default function BlogLibrary({ posts, query, overview }: { posts: PostMeta[]; query: BlogQuery; overview: boolean }) {
  const bySlug = new Map(posts.map(post => [post.slug, post]));
  const pick = (slugs: string[]) => slugs.map(slug => bySlug.get(slug)).filter((p): p is PostMeta => !!p);
  const featured = pick(FEATURED);
  const results = filterBlogPosts(posts, query);
  const pages = Math.max(1, Math.ceil(results.length / 12));
  const page = Math.min(query.page, pages);
  const shown = results.slice((page - 1) * 12, page * 12);
  return <div className={styles.library}>
    <header className={styles.header}><h1>The Dance With Ceech Blog</h1><p>Learn new moves. Feel better. Connect through dance.</p></header>
    <nav aria-label="Article topics" className={styles.topics}>
      {(Object.entries(TOPICS) as [BlogTopic, string][]).map(([topic, label]) => <Link key={topic} href={blogHref({ topic, q: query.q })} prefetch={false} aria-current={query.topic === topic ? 'page' : undefined}>{label}</Link>)}
    </nav>
    <div className={styles.tools}>
      <form action="/blog" method="get" role="search" className={styles.search}>
        <input type="hidden" name="view" value="all" /><input type="hidden" name="topic" value={query.topic} />
        {query.style && <input type="hidden" name="style" value={query.style} />}
        <Search size={20} aria-hidden="true" /><label className={styles.srOnly} htmlFor="blog-search">Search articles, moves, or topics</label>
        <input id="blog-search" name="q" type="search" autoComplete="off" maxLength={200} defaultValue={query.q} key={query.q} placeholder="Search articles, moves, or topics…" /><button type="submit">Search</button>
      </form>
      <Link href={blogHref({ topic: 'learn' }) + '#styles'} prefetch={false} className={styles.browse}>Browse dance styles <ArrowRight size={17} aria-hidden="true" /></Link>
    </div>
    {query.topic === 'learn' && <nav id="styles" aria-label="Dance styles" className={styles.styleLinks}>
      <Link href={blogHref({ ...query, style: '', page: 1 })} prefetch={false} aria-current={!query.style ? 'page' : undefined}>All styles & tips</Link>
      {Object.entries(STYLES).map(([style, label]) => <Link key={style} href={blogHref({ ...query, style, page: 1 })} prefetch={false} aria-current={query.style === style ? 'page' : undefined}>{label}</Link>)}
    </nav>}
    {overview ? <>
      <section aria-label="Featured articles" className={styles.featured}>
        <h2 className={styles.srOnly}>Featured articles</h2>
        {featured[0] && <Article post={featured[0]} variant="lead" />}
        <div className={styles.supporting}>{featured.slice(1).map(post => <Article key={post.slug} post={post} variant="support" />)}</div>
      </section>
      <section aria-labelledby="more-title" className={styles.more}>
        <div className={styles.sectionHeading}><h2 id="more-title">More to explore</h2><Link href={blogHref()} prefetch={false}>View all {posts.length} articles <ArrowRight size={16} aria-hidden="true" /></Link></div>
        <div className={styles.moreGrid}>{pick(MORE).map(post => <Article key={post.slug} post={post} variant="small" />)}</div>
      </section>
    </> : <section id="articles" aria-labelledby="results-title" className={styles.results}>
      <div className={styles.sectionHeading}><div><h2 id="results-title">{query.q ? `Results for “${query.q}”` : TOPICS[query.topic]}</h2><p>{results.length} {results.length === 1 ? 'article' : 'articles'}{results.length > 0 ? ` · Showing ${(page - 1) * 12 + 1}–${Math.min(page * 12, results.length)}` : ''}</p></div>{(query.q || query.style) && <Link href={blogHref({ topic: query.topic })} prefetch={false}>Clear filters</Link>}</div>
      {shown.length ? <div className={styles.resultsGrid}>{shown.map(post => <Article key={post.slug} post={post} />)}</div> : <div className={styles.empty}><h3>No articles found</h3><p>Try a different move or a shorter search, or explore all articles.</p><Link href={blogHref()} prefetch={false}>Browse all articles <ArrowRight size={16} aria-hidden="true" /></Link></div>}
      {pages > 1 && <nav aria-label="Article pages" className={styles.pagination}>
        {page > 1 && <Link href={blogHref({ ...query, page: page - 1 }) + '#articles'} prefetch={false}>Previous</Link>}
        {Array.from({ length: pages }, (_, i) => i + 1).map(number => <Link key={number} href={blogHref({ ...query, page: number }) + '#articles'} prefetch={false} aria-label={`Page ${number}`} aria-current={page === number ? 'page' : undefined}>{number}</Link>)}
        {page < pages && <Link href={blogHref({ ...query, page: page + 1 }) + '#articles'} prefetch={false}>Next</Link>}
      </nav>}
    </section>}
    <aside className={styles.cta}><div><h2>Want help putting it into practice?</h2><p>Talk with Ceech about your goals and where to start.</p></div><Link href="/private-lessons#booking" prefetch={false}>Book a Free Call <ArrowRight size={18} aria-hidden="true" /></Link></aside>
  </div>;
}
