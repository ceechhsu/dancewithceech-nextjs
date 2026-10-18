# Runtime teaching playlist

The homepage Quick Hip-Hop Dance Lessons section and `/dance-tutorials` read the same public YouTube playlist at runtime: `PLZ0erJmV3GWU`, owned by `UCj1NxAUMAfRaSv4A3ia7wCQ`. The homepage displays the six newest public releases; the searchable library displays the full current membership and retains its full tutorial articles. New playlist additions require no website deployment.

## Read and refresh behavior

The server-only reader uses `YOUTUBE_TEACHING_API_KEY` for read-only `playlists.list`, `playlistItems.list`, and `videos.list` calls. It verifies playlist ownership/public visibility, traverses all pages, deduplicates IDs, batches video metadata reads, and includes only processed public videos already published by the expected channel. Scheduled, live, deleted, private, unlisted and foreign-channel videos are excluded. The curated playlist determines teaching selection; the API has no definitive Shorts boolean.

Next.js Data Cache stores each complete normalized snapshot for 15 minutes, with demand-driven stale-while-revalidate behavior. Browser views read the shared `/api/teaching-lessons` endpoint on entry, visibility return, and every 60 seconds while visible. The endpoint uses `private, no-store` HTTP caching. The first request after expiry may receive the prior snapshot while refresh runs; subsequent reads receive the refreshed snapshot. This is not a scheduled publication job.

A failed or partial refresh throws before replacing a successful snapshot. An intentionally empty playlist is a successful empty snapshot and removes previous lessons. Fallback retention is capped at 24 hours on both server and client; cold-cache errors show an unavailable/retry state. No unverified inventory becomes a fallback membership source. The site never publishes, schedules or modifies videos or playlists.

## Metadata and presentation

The original verified inventory enriches only current playlist members with practice cues, source Live timestamps/dates and next steps. New members use published metadata, conservative skill tags, and explicit timestamped YouTube source links where present. Missing source information stays optional; publication time is never substituted for a Live date. Search, skill/style filters, playback selection, lazy embeds and keyboard focus remain in the existing layouts. Removed members lose their playback selection. The three existing teaching videos are preserved.

## Environment and verification

Keep `YOUTUBE_TEACHING_API_KEY` server-only, stored as a Production-only Vercel Secret. Do not use a `NEXT_PUBLIC_` prefix, commit local environment files, pull production secret values, or log provider URLs/error bodies. The separate development key has a Mac outbound-IP restriction; local verification used IPv4-first DNS resolution without relaxing that restriction. Production uses its separately approved API-restricted key.

Release preparation verified all 20 public playlist IDs and their newest-first order against the publishing worker receipt, including real titles, thumbnails, durations, source timestamps and Live dates. TypeScript, ESLint, production build and 16 reader/enrichment tests passed. Browser checks at 390px and 1440px covered both views, search/filter/empty/reset, keyboard controls, lazy players, source references, original teaching videos, overflow and accessibility. Tested players loaded without fallback errors; this does not establish complete viewing or audio quality.

Controlled upstream fixtures exercised actual Next production-cache hot reuse, expiry/new-member refresh without rebuilding, failed-refresh retention and successful empty replacement. Real API reads reused the cached snapshot. Local exposure checks found no development key in browser bundles, public responses or saved logs; browsers made no direct YouTube Data API requests. Production must be verified again after deployment, without retrieving the Production Secret.

## Operational limits

The separate publishing worker adds only confirmed-public teaching clips to the dedicated playlist. Upstream propagation and demand-driven refresh can delay visibility beyond publication time. Successful refresh removes videos no longer in the playlist. The normalized cache schema is keyed by playlist ID and `lesson-schema-v1`; increment that version if normalization changes.

## References

- https://developers.google.com/youtube/data/reference/rest/v3/playlistItems/list
- https://developers.google.com/youtube/data/reference/rest/v3/videos/list
- https://nextjs.org/docs/app/api-reference/functions/unstable_cache
