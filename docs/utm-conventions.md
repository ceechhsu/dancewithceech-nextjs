# UTM Conventions — DanceWithCeech

Every outbound link from social, GMB, or email must carry UTMs so GA4 can attribute traffic to channels. Without this, all non-organic traffic shows as `(direct) / (none)` and we can't measure what's working.

## The three tags we use

### `utm_source` — where the click came from
- `ig` — Instagram
- `tt` — TikTok
- `fb` — Facebook
- `yt` — YouTube
- `gmb` — Google Business Profile
- `email` — Resend / systeme.io campaigns
- `bio` — fallback when source is unclear

### `utm_medium` — the format of the placement
- `linkinbio` — bio link (IG/TT/FB/YT link trees)
- `post` — feed post (image/carousel) with link in caption or sticker
- `reel` — short-form video (Reels/TikTok/Shorts)
- `story` — Stories with link sticker
- `dm` — direct message link
- `broadcast` — email broadcast

### `utm_campaign` — the specific initiative or content theme
Use kebab-case slugs. Examples:
- `rhythm-first-launch` — BeatFirst push, Week 1
- `academy-waitlist` — Academy founding tier awareness
- `move-of-week` — Pillar A weekly tutorial reel
- `student-wins` — Pillar D social proof
- `gmb-weekly` — Google Business Profile weekly tip post

## Link-in-bio setup

The `/links` page is the canonical bio destination. Set IG, TikTok, Facebook, and YouTube bio URLs to:

- Instagram: `https://dancewithceech.com/links?src=ig`
- TikTok: `https://dancewithceech.com/links?src=tt`
- Facebook: `https://dancewithceech.com/links?src=fb`
- YouTube: `https://dancewithceech.com/links?src=yt`

The page reads the `src` query param and bakes `utm_source={src}`, `utm_medium=linkinbio`, and `utm_campaign={card}` into every outbound click.

## Post-level UTMs (when linking directly, not via /links)

When a Reel/Story/post links to a specific page (not `/links`), tag the URL manually.

Examples:
- Reel teaching the Smurf → `https://dancewithceech.com/blog/hip-hop-dance-move-smurf?utm_source=ig&utm_medium=reel&utm_campaign=move-of-week`
- GMB weekly tip linking to a blog post → `...?utm_source=gmb&utm_medium=post&utm_campaign=gmb-weekly`
- Email announcing founding tier → `...?utm_source=email&utm_medium=broadcast&utm_campaign=academy-waitlist`

## Verifying UTMs land in GA4

After posting:
1. Click the link from the actual platform (not a preview).
2. Open GA4 → Reports → Realtime.
3. Scroll to "Traffic source" — you should see `{utm_source} / {utm_medium}` appear within 30 seconds.
4. If it shows `(direct) / (none)` instead, the UTM didn't make it through — check for platform link stripping (TikTok sometimes drops params in captions; use bio link with `?src=tt` instead).

## Why this matters

Without UTMs, 90% of social traffic looks like direct visits and we can't tell which pillar, platform, or campaign drives conversions. The goal for the 90-day window is to know, at the end: "IG Reels drove X Academy waitlist signups; GMB drove Y private lessons consults." That requires this discipline on every outbound link.
