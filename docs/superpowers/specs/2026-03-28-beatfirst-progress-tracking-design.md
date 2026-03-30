# BeatFirst Progress Tracking — Design Spec
Date: 2026-03-28

## Purpose

Add session history and progress visualization to BeatFirst so logged-in players can track their rhythm improvement over time. The goal is twofold: motivate players to keep training by making improvement visible, and build trust in the teaching method so players convert to paid academy lessons.

---

## Mastery System

- **Mastery threshold**: score ≥ 90% on the 3 most recent sessions for a given beat
- **Mastery is permanent once earned** — stored in `beat_masteries`; never revoked even if later sessions score below 90
- Mastery check pseudocode (run server-side after each save):
  ```
  already_mastered = exists in beat_masteries for (user_email, beat_id)
  if already_mastered → return { mastered: false }  // not newly mastered this session
  last3 = last 3 game_sessions for (user_email, beat_id) ordered by played_at desc
  if last3.length === 3 && last3.every(s => s.score_pct >= 90):
    insert into beat_masteries (user_email, beat_id)
    return { mastered: true }   // newly mastered → client shows celebration banner
  return { mastered: false }
  ```
- **`mastered: true` means "just earned mastery for the first time this session"** — the client shows the celebration banner only when this is true

- **Academy CTA threshold**: all beats where `difficulty === 'beginner'` mastered + at least `INTERMEDIATE_MASTERY_REQUIRED = 2` beats where `difficulty === 'intermediate'` mastered — computed dynamically from `BEATS`. Advanced beats are intentionally excluded; the CTA is a gateway to real lessons, not a completion badge.

---

## Data Model

### `game_sessions`
```sql
create table game_sessions (
  id          uuid default gen_random_uuid() primary key,
  user_email  text not null,
  beat_id     text not null,
  score_pct   integer not null check (score_pct >= 0 and score_pct <= 100),
  perfect     integer not null check (perfect >= 0),
  good        integer not null check (good >= 0),
  ok          integer not null check (ok >= 0),
  miss        integer not null check (miss >= 0),
  played_at   timestamptz not null default now()
);

create index on game_sessions (user_email, beat_id, played_at desc);
```

### `beat_masteries`
```sql
create table beat_masteries (
  user_email  text not null,
  beat_id     text not null,
  mastered_at timestamptz not null default now(),
  primary key (user_email, beat_id)
);
```

### RLS
Enable RLS on both tables. With RLS enabled and no permissive policies, Postgres denies all direct client access by default — no explicit deny policy needed:
```sql
alter table game_sessions enable row level security;
alter table beat_masteries enable row level security;
```
All reads/writes go through API routes using the service role key, which bypasses RLS.

---

## Shared Modules

### `src/lib/beats.ts` (new — create first, dependency of API routes and ProgressTab)
- Extracted `Beat` type and `BEATS` array from `BeatFirstGame.tsx`
- Export: `export const INTERMEDIATE_MASTERY_REQUIRED = 2`
- **Must have no `'use client'` directive** — this is a plain shared module with no browser APIs, importable from both server-side API routes and client components

### `src/lib/supabase-admin.ts` (new)
- Must only be imported from API routes or Server Components — never from client components
```ts
import 'server-only'
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)
```
The `import 'server-only'` guard throws a build error if this file is accidentally imported in a client component.

---

## API Routes

### `POST /api/game/save-session`

**Auth:** Return 401 if no NextAuth session or if `session.user.email` is missing.

**Request body:** `{ beat_id: string, score_pct: number, perfect: number, good: number, ok: number, miss: number }`

**Validation:** Return 400 if:
- `score_pct` is not an integer in range 0–100
- Any count field is negative or non-integer
- `beat_id` is not a valid `id` in `BEATS` (import `BEATS` from `src/lib/beats.ts` to validate)

**score_pct source:** Use the value already computed by `endGame()`: `Math.round((hits / ideals.length) * 100)`. Do not recompute server-side.

**Logic:**
1. `await` insert row into `game_sessions`
2. `await` mastery check query (see pseudocode in Mastery System section above) — the insert must complete before the query runs so the new row is included in the `last 3` result

**Response:** `{ saved: true, mastered: boolean }`

---

### `GET /api/game/sessions`

**Auth:** Return 401 if no NextAuth session.

**Logic:** Select all rows from `game_sessions` for `user_email` ordered by `played_at asc` (ascending is intentional — `ProgressTab` uses session index as the X-axis). Also select all rows from `beat_masteries` for `user_email`. No pagination for v1.

**Response:**
```ts
{
  sessions: Array<{
    id: string
    beat_id: string
    score_pct: number
    perfect: number
    good: number
    ok: number
    miss: number
    played_at: string  // ISO 8601
  }>,
  masteries: Array<{
    beat_id: string
    mastered_at: string  // ISO 8601
  }>
}
```

---

## Component Architecture

### `src/auth.ts` (modified)
NextAuth v5 with Google OAuth uses the `jwt` session strategy by default. Add a `callbacks` block to ensure `user.email` is always forwarded from the JWT token to the session object:
```ts
callbacks: {
  jwt({ token, profile }) {
    if (profile?.email) token.email = profile.email
    return token
  },
  session({ session, token }) {
    if (token.email) session.user.email = token.email as string
    return session
  }
}
```

### `BeatFirstGame.tsx` (modified)
- Import `BEATS` and `Beat` from `src/lib/beats.ts`
- Add "Play" | "My Progress" tab switcher at top
- All save logic lives **inside `endGame()`**, not in a caller or `useEffect`. Specifically, at the end of `endGame()`, after `tapResults` is fully built and `pct` is computed:
  ```ts
  // Derive rating counts
  const perfect = tapResults.filter(r => r.rating === 'perfect').length
  const good    = tapResults.filter(r => r.rating === 'good').length
  const ok      = tapResults.filter(r => r.rating === 'ok').length
  const miss    = tapResults.filter(r => r.rating === 'miss').length

  // Transition to results screen immediately (do not await the save)
  setScore({ hits, total: ideals.length, pct })
  setResults(tapResults)
  setPhase('results')

  // Save asynchronously — does not block results render
  if (user) {
    fetch('/api/game/save-session', { method: 'POST', ... })
      .then(res => res.json())
      .then(data => { if (data.mastered) setShowMasteryBanner(true) })
      .catch(() => { if (process.env.NODE_ENV === 'development') console.error('save-session failed') })
  }
  ```
- Add `showMasteryBanner` state (boolean); render celebration banner when true
- **Celebration banner dismiss:** sets `showMasteryBanner(false)`, reveals results screen underneath
- On network error or non-2xx: fail silently, log to console in development only

### `src/components/ProgressTab.tsx` (new)
- Import `BEATS`, `INTERMEDIATE_MASTERY_REQUIRED` from `src/lib/beats.ts`
- Fetch `GET /api/game/sessions` on mount
- **Loading state:** show a subtle spinner or skeleton rows — do not show empty state while loading
- **Error state:** show "Could not load your progress. Try refreshing." — do not crash
- Group `sessions` by `beat_id`; use `masteries` array for mastered status
- **Improvement delta** = `best_score_pct − first_session_score_pct` for a given beat

Renders:
- **Summary bar**: Mastered count · In Progress count · Total Sessions
- **Academy CTA banner** (pinned, conditional): shown when mastery threshold met — "Your rhythm is real — you're ready for real lessons" + link to academy
- **Beat rows**: sorted mastered (green ★) → in progress (yellow) → never played (gray)
  - Every beat in `BEATS` is always rendered, including never-played ones
  - Each collapsed row: beat name, status badge, session count, best score, **sparkline**
  - **Sparkline spec**: canvas-drawn bar chart, 80px wide × 32px tall, shows last 20 sessions max (oldest to newest left to right), one bar per session, bar color matches score zone (green ≥90%, yellow 60–89%, red <60%), no axes or labels — purely visual trend indicator
  - Click row to expand inline
- **Expanded row**: stat pills (First Score, Best Score, Sessions, Improvement delta, "Mastery: 90% × 3 in a row") + score % line graph (X-axis: session index + `played_at` date label, dashed green line at 90%) + stacked breakdown bars per session (perfect / good / ok / miss, color-coded to match existing `ratingColor` function)

- If user not logged in: show sign-in prompt only, no fetch

---

## UX Flow

**After every completed game (logged-in):**
1. Results screen renders immediately
2. `POST /api/game/save-session` fires asynchronously
3. When response resolves: if `mastered === true`, celebration banner overlays results screen
4. Dismiss banner → banner closes, results screen remains → player exits via normal flow

**Progress tab (anytime):**
- Accessible via tab — no need to finish a game
- Beat rows expand inline on click
- Academy CTA pinned at top once threshold met

**Not logged in:**
- Tab exists but shows sign-in prompt: "Sign in to track your progress"

---

## Out of Scope

- Leaderboards / comparing with other players
- Push notifications or email reminders
- Exporting progress data
- Guest/anonymous session tracking

---

## Pre-Implementation Setup

Before writing any code, complete these two steps:

1. **Install `server-only` package:**
   ```bash
   npm install server-only
   ```

2. **Add service role key to `.env.local`:**
   ```
   SUPABASE_SERVICE_ROLE_KEY=<value from Supabase dashboard → Project Settings → API → service_role key>
   ```
   This is a secret — never prefix it with `NEXT_PUBLIC_`.

---

## Files Changed (in implementation order)

| Order | File | Change |
|-------|------|--------|
| 1 | `src/lib/beats.ts` | New — Beat type, BEATS array, INTERMEDIATE_MASTERY_REQUIRED |
| 2 | `src/lib/supabase-admin.ts` | New — service role client with server-only guard |
| 3 | Supabase dashboard | Create tables + indexes + enable RLS |
| 4 | `.env.local` | Add `SUPABASE_SERVICE_ROLE_KEY` |
| 5 | `src/auth.ts` | Add callbacks.session to expose user.email |
| 6 | `src/app/api/game/save-session/route.ts` | New — save session + mastery check |
| 7 | `src/app/api/game/sessions/route.ts` | New — fetch sessions + masteries |
| 8 | `src/components/ProgressTab.tsx` | New — progress dashboard |
| 9 | `src/components/BeatFirstGame.tsx` | Import beats, tab switcher, rating counts, save call, mastery banner |
