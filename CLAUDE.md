# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server on port 3000
npm run build    # Production build (also runs static generation for all blog posts)
npm run start    # Serve production build
npm run lint     # ESLint validation
```

No test suite is configured.

## Architecture

This is a **static JAMstack site** — no database, no API routes, no auth. All data is read from the filesystem at build time.

### Content layer

- **87 markdown blog posts** live in `src/content/posts/` with YAML frontmatter (`title`, `slug`, `date`, `category`)
- `src/lib/posts.ts` contains all post-fetching logic: `getAllPosts()` and `getPostBySlug()`
- `src/content/redirects.json` maps 125+ legacy WordPress URLs to new paths, consumed by `next.config.ts`

### Routing (Next.js App Router)

- All routes are under `src/app/` using the App Router file convention
- Blog posts use `generateStaticParams()` in `src/app/blog/[slug]/page.tsx` to pre-render all posts at build time
- Blog index at `/blog` filters by `?category=` query param
- Dance-style pages (`/hip-hop-dance-moves`, etc.) are standalone static pages

### Styling

- Tailwind CSS 4 + custom CSS variables in `src/app/globals.css`
- **Dark mode only** — no light theme exists
- Color palette: background `#0A0A0A`/`#111111`, text `#F9F9F9`, accent blue `#2563EB`, accent gold `#FDB515`

### Components

Only one shared component: `src/components/Nav.tsx`. Most pages are self-contained with inline JSX — avoid over-abstracting.

### External integrations

- **Calendly embed** — hardcoded in `/private-lessons` page
- **Google Maps embed** — hardcoded in `/contact` page
- No environment variables required; all credentials/URLs are hardcoded inline

### Path alias

`@/*` resolves to `./src/*` (configured in `tsconfig.json`).

## Adding blog posts

Create a `.md` file in `src/content/posts/` with frontmatter:

```markdown
---
title: "Post Title"
slug: "post-slug"
date: "2026-01-15"
category: "hip-hop-dance-moves"
---

Post content here...
```

Valid categories: `hip-hop-dance-moves`, `locking-dance-moves`, `breaking-dance-moves`, `funk-style-dance-moves`, `house-dance`, `general`

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
