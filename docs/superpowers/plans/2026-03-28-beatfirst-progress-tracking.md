# BeatFirst Progress Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-beat session history and progress visualization to BeatFirst, with a permanent mastery system and an academy conversion CTA.

**Architecture:** Supabase stores game sessions and mastery records via two tables. Two Next.js API routes (save-session, sessions) bridge NextAuth identity to Supabase using the service role key. A new ProgressTab component renders the dashboard with sparklines and expandable graphs. BeatFirstGame.tsx gains a tab switcher, async session saving after each game, and a mastery celebration banner.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (postgres), NextAuth v5, Tailwind CSS, inline SVG for charts

---

## File Map

| File | Status | Responsibility |
|------|--------|----------------|
| `src/lib/beats.ts` | Create | Beat type, BEATS array, INTERMEDIATE_MASTERY_REQUIRED — shared module, no `'use client'` |
| `src/lib/supabase-admin.ts` | Create | Service role Supabase client with `server-only` guard |
| `src/auth.ts` | Modify | Add jwt + session callbacks to expose user.email |
| `src/app/api/game/save-session/route.ts` | Create | POST: insert session, check mastery, return `{ saved, mastered }` |
| `src/app/api/game/sessions/route.ts` | Create | GET: return all sessions + masteries for user |
| `src/components/ProgressTab.tsx` | Create | Progress dashboard — summary bar, beat rows, sparklines, expandable graphs |
| `src/components/BeatFirstGame.tsx` | Modify | Import beats from lib, tab switcher, endGame save call, mastery banner |

---

## Task 0: Pre-Implementation Setup

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `.env.local`
- Supabase dashboard (manual)

- [ ] **Step 1: Install server-only package**

```bash
cd /Volumes/ACASIS4T/DanceWithCeech.com/nextjs-site
npm install server-only
```

Expected: installs without errors.

- [ ] **Step 2: Add service role key to .env.local**

Open Supabase dashboard → Project Settings → API → copy the `service_role` secret key (not the anon key). Add to `.env.local`:

```
SUPABASE_SERVICE_ROLE_KEY=<paste-key-here>
```

Never prefix this with `NEXT_PUBLIC_` — it must stay server-side only.

- [ ] **Step 3: Create Supabase tables**

Open Supabase dashboard → SQL Editor → New query → paste and run:

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

create table beat_masteries (
  user_email  text not null,
  beat_id     text not null,
  mastered_at timestamptz not null default now(),
  primary key (user_email, beat_id)
);

alter table game_sessions enable row level security;
alter table beat_masteries enable row level security;
```

Expected: both tables appear in Supabase Table Editor. No errors. RLS enabled means no direct client access — all reads/writes go through API routes using the service role key which bypasses RLS.

- [ ] **Step 4: Commit**

```bash
cd /Volumes/ACASIS4T/DanceWithCeech.com/nextjs-site
git add package.json package-lock.json
git commit -m "chore: install server-only for admin Supabase client"
```

---

## Task 1: Extract beats to shared module

**Files:**
- Create: `src/lib/beats.ts`
- Modify: `src/components/BeatFirstGame.tsx` (remove inline Beat type + BEATS, add import)

- [ ] **Step 1: Create `src/lib/beats.ts`**

This file has no `'use client'` directive — it must be importable from both server-side API routes and client components.

```ts
// ─── Beat Library ─────────────────────────────────────────────────────────────

export type Beat = {
  id: string
  name: string
  genre: string
  bpm: number
  bars: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  kick:  number[]
  snare: number[]
  hihat: number[]
  taps:  number[]  // which steps the player is scored on
}

export const BEATS: Beat[] = [
  {
    id: 'hiphop-basic',
    name: 'Hip-Hop Basic',
    genre: 'hip-hop-dance-moves',
    bpm: 100,
    bars: 8,
    difficulty: 'beginner',
    kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
    snare: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    hihat: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    taps:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
  },
  {
    id: 'hiphop-basic-2',
    name: 'Hip-Hop Basic II',
    genre: 'hip-hop-dance-moves',
    bpm: 90,
    bars: 8,
    difficulty: 'beginner',
    kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hihat: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    taps:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
  },
  {
    id: 'hiphop-intermediate',
    name: 'Hip-Hop Intermediate',
    genre: 'hip-hop-dance-moves',
    bpm: 90,
    bars: 8,
    difficulty: 'intermediate',
    kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hihat: [0,0,0,0, 0,0,0,0, 1,0,1,0, 1,0,0,0],
    taps:  [1,0,0,0, 1,0,0,0, 1,0,1,0, 1,0,0,0],
  },
  {
    id: 'hiphop-hihat',
    name: 'Hip-Hop Hi-Hat',
    genre: 'hip-hop-dance-moves',
    bpm: 90,
    bars: 4,
    difficulty: 'intermediate',
    kick:  [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,1,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hihat: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
    taps:  [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,1,0],
  },
  {
    id: 'funk-groove',
    name: 'Funk Groove',
    genre: 'funk-style-dance-moves',
    bpm: 95,
    bars: 4,
    difficulty: 'intermediate',
    kick:  [1,0,0,1, 0,0,1,0, 1,0,0,0, 0,1,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hihat: [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
    taps:  [1,0,0,1, 0,0,1,0, 1,0,0,0, 0,1,0,0],
  },
  {
    id: 'house',
    name: 'House Four-on-Floor',
    genre: 'house-dance',
    bpm: 125,
    bars: 4,
    difficulty: 'advanced',
    kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hihat: [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
    taps:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
  },
  {
    id: 'locking-funk',
    name: 'Locking Funk Break',
    genre: 'locking-dance-moves',
    bpm: 100,
    bars: 4,
    difficulty: 'advanced',
    kick:  [1,0,1,0, 0,1,0,0, 1,0,0,1, 0,0,1,0],
    snare: [0,0,0,0, 1,0,0,1, 0,0,0,0, 1,0,0,0],
    hihat: [1,0,1,1, 0,1,1,0, 1,0,1,1, 0,1,1,0],
    taps:  [1,0,1,0, 0,1,0,0, 1,0,0,1, 0,0,1,0],
  },
]

export const INTERMEDIATE_MASTERY_REQUIRED = 2
```

- [ ] **Step 2: Update `BeatFirstGame.tsx` to import from beats.ts**

At the top of the file, add:
```ts
import { Beat, BEATS } from '@/lib/beats'
```

Then delete the inline `type Beat { ... }` block (currently lines 9–19) and the `const BEATS: Beat[] = [...]` block (currently lines 21–77). The rest of the file is unchanged.

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: Build succeeds. No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/beats.ts src/components/BeatFirstGame.tsx
git commit -m "refactor: extract Beat type and BEATS array to src/lib/beats.ts"
```

---

## Task 2: Create Supabase admin client

**Files:**
- Create: `src/lib/supabase-admin.ts`

- [ ] **Step 1: Create `src/lib/supabase-admin.ts`**

```ts
import 'server-only'
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)
```

The `import 'server-only'` line throws a build error if this file is accidentally imported in a client component.

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase-admin.ts
git commit -m "feat: add supabase admin client with service role key"
```

---

## Task 3: Update auth.ts to expose user.email

**Files:**
- Modify: `src/auth.ts`

- [ ] **Step 1: Replace `src/auth.ts` with**

```ts
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    jwt({ token, profile }) {
      if (profile?.email) token.email = profile.email
      return token
    },
    session({ session, token }) {
      if (token.email) session.user.email = token.email as string
      return session
    },
  },
})
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/auth.ts
git commit -m "feat: expose user.email in NextAuth session via jwt callback"
```

---

## Task 4: Create save-session API route

**Files:**
- Create: `src/app/api/game/save-session/route.ts`

- [ ] **Step 1: Create `src/app/api/game/save-session/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { BEATS } from '@/lib/beats'

const validBeatIds = new Set(BEATS.map(b => b.id))

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { beat_id, score_pct, perfect, good, ok, miss } = body as Record<string, unknown>

  if (
    typeof beat_id !== 'string' || !validBeatIds.has(beat_id) ||
    !Number.isInteger(score_pct) || (score_pct as number) < 0 || (score_pct as number) > 100 ||
    !Number.isInteger(perfect) || (perfect as number) < 0 ||
    !Number.isInteger(good)    || (good as number) < 0 ||
    !Number.isInteger(ok)      || (ok as number) < 0 ||
    !Number.isInteger(miss)    || (miss as number) < 0
  ) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const user_email = session.user.email

  // 1. Insert session (await before mastery check — new row must be in the last-3 query)
  const { error: insertError } = await supabaseAdmin
    .from('game_sessions')
    .insert({ user_email, beat_id, score_pct, perfect, good, ok, miss })

  if (insertError) {
    console.error('save-session insert error:', insertError)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  // 2. Skip mastery check if already mastered
  const { data: existingMastery } = await supabaseAdmin
    .from('beat_masteries')
    .select('beat_id')
    .eq('user_email', user_email)
    .eq('beat_id', beat_id)
    .maybeSingle()

  if (existingMastery) {
    return NextResponse.json({ saved: true, mastered: false })
  }

  // 3. Check last 3 sessions for this beat
  const { data: last3 } = await supabaseAdmin
    .from('game_sessions')
    .select('score_pct')
    .eq('user_email', user_email)
    .eq('beat_id', beat_id)
    .order('played_at', { ascending: false })
    .limit(3)

  const newlyMastered =
    last3 !== null &&
    last3.length === 3 &&
    last3.every(s => s.score_pct >= 90)

  if (newlyMastered) {
    await supabaseAdmin
      .from('beat_masteries')
      .insert({ user_email, beat_id })
  }

  return NextResponse.json({ saved: true, mastered: newlyMastered })
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds. No type errors.

- [ ] **Step 3: Smoke test (manual)**

```bash
npm run dev
```

Sign in with Google. Play Hip-Hop Basic to completion. Open DevTools → Network. Verify POST to `/api/game/save-session` returns `{ saved: true, mastered: false }`. Open Supabase Table Editor → `game_sessions` — verify one row inserted.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/game/save-session/route.ts
git commit -m "feat: add save-session API route with mastery check"
```

---

## Task 5: Create sessions GET API route

**Files:**
- Create: `src/app/api/game/sessions/route.ts`

- [ ] **Step 1: Create `src/app/api/game/sessions/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user_email = session.user.email

  // Fetch sessions (asc = oldest first, matches graph X-axis order) and masteries in parallel
  const [
    { data: sessions, error: sessionsError },
    { data: masteries, error: masteriesError },
  ] = await Promise.all([
    supabaseAdmin
      .from('game_sessions')
      .select('id, beat_id, score_pct, perfect, good, ok, miss, played_at')
      .eq('user_email', user_email)
      .order('played_at', { ascending: true }),
    supabaseAdmin
      .from('beat_masteries')
      .select('beat_id, mastered_at')
      .eq('user_email', user_email),
  ])

  if (sessionsError || masteriesError) {
    console.error('sessions fetch error:', sessionsError ?? masteriesError)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ sessions: sessions ?? [], masteries: masteries ?? [] })
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Smoke test (manual)**

With dev server running and signed in, visit `http://localhost:3000/api/game/sessions`.
Expected: `{ sessions: [...], masteries: [] }` — the session from Task 4 smoke test should appear.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/game/sessions/route.ts
git commit -m "feat: add sessions GET API route"
```

---

## Task 6: Create ProgressTab component

**Files:**
- Create: `src/components/ProgressTab.tsx`

- [ ] **Step 1: Create `src/components/ProgressTab.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'
import { BEATS, INTERMEDIATE_MASTERY_REQUIRED } from '@/lib/beats'

// ─── Types ───────────────────────────────────────────────────────────────────

type Session = {
  id: string
  beat_id: string
  score_pct: number
  perfect: number
  good: number
  ok: number
  miss: number
  played_at: string
}

type Mastery = {
  beat_id: string
  mastered_at: string
}

type BeatProgress = {
  beat_id: string
  name: string
  difficulty: string
  sessions: Session[]
  mastered: boolean
}

type Props = {
  user: { name?: string | null; email?: string | null; image?: string | null } | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ratingColor = (r: string): string =>
  ({ perfect: '#22c55e', good: '#86efac', ok: '#FDB515', miss: '#ef4444' })[r] ?? '#888'

function scoreColor(pct: number): string {
  if (pct >= 90) return '#22c55e'
  if (pct >= 60) return '#FDB515'
  return '#ef4444'
}

// ─── Sparkline ────────────────────────────────────────────────────────────────
// SVG bar chart, 80×32px, last 20 sessions, no axes

function Sparkline({ sessions }: { sessions: Session[] }) {
  const last20 = sessions.slice(-20)
  if (last20.length === 0) return <div style={{ width: 80, height: 32 }} />
  const barW = Math.max(2, Math.floor(78 / last20.length) - 1)
  return (
    <svg width={80} height={32} style={{ display: 'block', flexShrink: 0 }}>
      {last20.map((s, i) => {
        const h = Math.max(2, Math.round((s.score_pct / 100) * 28))
        return (
          <rect
            key={s.id}
            x={i * (barW + 1)}
            y={32 - h}
            width={barW}
            height={h}
            fill={scoreColor(s.score_pct)}
            rx={1}
          />
        )
      })}
    </svg>
  )
}

// ─── Expanded graph ───────────────────────────────────────────────────────────
// Score % line + stacked breakdown bars per session

function ExpandedGraph({ sessions }: { sessions: Session[] }) {
  if (sessions.length === 0) {
    return <p style={{ color: '#888', fontSize: 12 }}>No sessions yet.</p>
  }

  const W = 480, H = 120
  const padL = 28, padR = 8, padT = 12, padB = 28
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const n = sessions.length
  const toX = (i: number) => padL + (n > 1 ? (i / (n - 1)) * innerW : innerW / 2)
  const toY = (pct: number) => padT + innerH - (pct / 100) * innerH

  const points = sessions.map((s, i) => `${toX(i)},${toY(s.score_pct)}`).join(' ')
  const barW = Math.max(4, Math.min(20, Math.floor(innerW / n) - 2))

  const yLabels = [0, 25, 50, 75, 90, 100]
  const xLabelIndices = sessions.reduce<number[]>((acc, _, i) => {
    if (i === 0 || i === n - 1 || (n > 5 && i % Math.ceil(n / 5) === 0)) acc.push(i)
    return acc
  }, [])

  const bestScore = Math.max(...sessions.map(s => s.score_pct))
  const firstScore = sessions[0].score_pct
  const improvement = bestScore - firstScore

  return (
    <div>
      {/* Stat pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {[
          { label: 'First',       value: `${firstScore}%`,   color: scoreColor(firstScore) },
          { label: 'Best',        value: `${bestScore}%`,    color: '#22c55e' },
          { label: 'Sessions',    value: String(n),           color: '#F9F9F9' },
          { label: 'Improvement', value: `+${improvement}%`, color: '#2563EB' },
          { label: 'Mastery',     value: '90% × 3 in a row', color: '#888' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#0a0a0a', borderRadius: 20, padding: '3px 10px', fontSize: 11 }}>
            <span style={{ color: '#888' }}>{label} </span>
            <span style={{ color, fontWeight: 'bold' }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Score % line graph */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ color: '#888', fontSize: 9, marginBottom: 4 }}>SCORE % PER SESSION</div>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', background: '#0a0a0a', borderRadius: 6 }}>
          {yLabels.map(v => {
            const y = toY(v)
            return (
              <g key={v}>
                <line x1={padL} y1={y} x2={W - padR} y2={y}
                  stroke={v === 90 ? '#22c55e' : '#1a1a1a'}
                  strokeWidth={v === 90 ? 1 : 0.5}
                  strokeDasharray={v === 90 ? '4 4' : undefined} />
                <text x={padL - 4} y={y + 3} textAnchor="end" fontSize={7} fill={v === 90 ? '#22c55e' : '#444'}>{v}</text>
              </g>
            )
          })}
          <polyline points={points} fill="none" stroke="#2563EB" strokeWidth={2} strokeLinejoin="round" />
          {sessions.map((s, i) => (
            <circle key={s.id} cx={toX(i)} cy={toY(s.score_pct)} r={3} fill={scoreColor(s.score_pct)} />
          ))}
          {xLabelIndices.map(i => {
            const date = new Date(sessions[i].played_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            return (
              <text key={i} x={toX(i)} y={H - 4} textAnchor="middle" fontSize={7} fill="#444">
                S{i + 1} {date}
              </text>
            )
          })}
        </svg>
      </div>

      {/* Breakdown stacked bars */}
      <div>
        <div style={{ color: '#888', fontSize: 9, marginBottom: 4 }}>TAP BREAKDOWN PER SESSION</div>
        <svg width="100%" viewBox={`0 0 ${W} 60`} style={{ display: 'block', background: '#0a0a0a', borderRadius: 6 }}>
          {sessions.map((s, i) => {
            const total = (s.perfect + s.good + s.ok + s.miss) || 1
            const x = toX(i) - barW / 2
            const ratings = [
              { key: 'miss',    count: s.miss,    color: '#ef4444' },
              { key: 'ok',      count: s.ok,      color: '#FDB515' },
              { key: 'good',    count: s.good,    color: '#86efac' },
              { key: 'perfect', count: s.perfect, color: '#22c55e' },
            ]
            let y = 56
            return (
              <g key={s.id}>
                {ratings.map(({ key, count, color }) => {
                  const h = Math.round((count / total) * 52)
                  y -= h
                  return <rect key={key} x={x} y={y} width={barW} height={h} fill={color} opacity={0.85} />
                })}
              </g>
            )
          })}
        </svg>
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          {(['perfect', 'good', 'ok', 'miss'] as const).map(r => (
            <span key={r} style={{ color: ratingColor(r), fontSize: 9 }}>■ {r}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProgressTab({ user }: Props) {
  const [beatProgress, setBeatProgress] = useState<BeatProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) { setLoading(false); return }

    fetch('/api/game/sessions')
      .then(res => { if (!res.ok) throw new Error(); return res.json() })
      .then(({ sessions, masteries }: { sessions: Session[]; masteries: Mastery[] }) => {
        const sessionsByBeat: Record<string, Session[]> = {}
        sessions.forEach(s => {
          if (!sessionsByBeat[s.beat_id]) sessionsByBeat[s.beat_id] = []
          sessionsByBeat[s.beat_id].push(s)
        })
        const masteredSet = new Set(masteries.map(m => m.beat_id))
        const progress: BeatProgress[] = BEATS.map(b => ({
          beat_id:    b.id,
          name:       b.name,
          difficulty: b.difficulty,
          sessions:   sessionsByBeat[b.id] ?? [],
          mastered:   masteredSet.has(b.id),
        }))
        // Sort: mastered → in-progress → never played
        progress.sort((a, b) => {
          if (a.mastered !== b.mastered) return a.mastered ? -1 : 1
          if ((a.sessions.length > 0) !== (b.sessions.length > 0)) return a.sessions.length > 0 ? -1 : 1
          return 0
        })
        setBeatProgress(progress)
        setLoading(false)
      })
      .catch(() => { setError(true); setLoading(false) })
  }, [user])

  // Academy CTA check (computed from current beatProgress)
  const beginnerBeats    = BEATS.filter(b => b.difficulty === 'beginner')
  const intermediateBeats = BEATS.filter(b => b.difficulty === 'intermediate')
  const masteredIds       = new Set(beatProgress.filter(bp => bp.mastered).map(bp => bp.beat_id))
  const allBeginnerMastered      = beginnerBeats.every(b => masteredIds.has(b.id))
  const intermediateMasteredCount = intermediateBeats.filter(b => masteredIds.has(b.id)).length
  const showAcademyCTA = allBeginnerMastered && intermediateMasteredCount >= INTERMEDIATE_MASTERY_REQUIRED

  // Summary stats
  const masteredCount  = beatProgress.filter(bp => bp.mastered).length
  const inProgressCount = beatProgress.filter(bp => !bp.mastered && bp.sessions.length > 0).length
  const totalSessions   = beatProgress.reduce((sum, bp) => sum + bp.sessions.length, 0)

  // ── Not logged in ─────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <p style={{ color: 'var(--muted)' }}>Sign in to track your progress</p>
        <button
          onClick={() => signIn('google')}
          className="px-6 py-2 rounded-full font-medium text-white"
          style={{ backgroundColor: 'var(--accent-primary)' }}
        >
          Sign in with Google
        </button>
      </div>
    )
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col gap-3 py-4">
        {[0.5, 0.65, 0.8].map((op, i) => (
          <div key={i} style={{ height: 52, background: '#1a1a1a', borderRadius: 8, opacity: op }} />
        ))}
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="py-8 text-center" style={{ color: 'var(--muted)' }}>
        Could not load your progress. Try refreshing.
      </div>
    )
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3">

      {/* Summary bar */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { label: 'Mastered',       value: masteredCount,  color: '#22c55e' },
          { label: 'In Progress',    value: inProgressCount, color: '#FDB515' },
          { label: 'Total Sessions', value: totalSessions,  color: '#F9F9F9' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ flex: 1, background: '#1a1a1a', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
            <div style={{ color, fontSize: 20, fontWeight: 'bold' }}>{value}</div>
            <div style={{ color: '#555', fontSize: 10 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Academy CTA */}
      {showAcademyCTA && (
        <div style={{ background: '#1a1a1a', border: '1px solid #2563EB', borderRadius: 10, padding: '12px 16px' }}>
          <p className="font-semibold" style={{ color: '#F9F9F9', marginBottom: 4 }}>
            Your rhythm is real — you&apos;re ready for real lessons
          </p>
          <a href="/private-lessons" className="text-sm font-medium" style={{ color: '#2563EB' }}>
            Book a lesson →
          </a>
        </div>
      )}

      {/* Beat rows */}
      {beatProgress.map(bp => {
        const isExpanded  = expandedId === bp.beat_id
        const bestScore   = bp.sessions.length > 0 ? Math.max(...bp.sessions.map(s => s.score_pct)) : null
        const statusColor = bp.mastered ? '#22c55e' : bp.sessions.length > 0 ? '#FDB515' : '#555'
        const statusLabel = bp.mastered ? '★ MASTERED' : bp.sessions.length > 0 ? 'IN PROGRESS' : 'NOT STARTED'
        const borderColor = bp.mastered ? '#22c55e33' : bp.sessions.length > 0 ? '#FDB51533' : '#1a1a1a'

        return (
          <div key={bp.beat_id} style={{ borderRadius: 8, overflow: 'hidden' }}>
            {/* Collapsed row */}
            <div
              onClick={() => setExpandedId(isExpanded ? null : bp.beat_id)}
              style={{
                background: '#1a1a1a',
                border: `1px solid ${borderColor}`,
                borderBottomLeftRadius:  isExpanded ? 0 : 8,
                borderBottomRightRadius: isExpanded ? 0 : 8,
                padding: '10px 14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: statusColor, fontSize: 10, fontWeight: 'bold' }}>
                  {isExpanded ? '▼' : '▶'} {statusLabel} · {bp.name}
                </div>
                <div style={{ color: '#555', fontSize: 9, marginTop: 1 }}>
                  {bp.sessions.length} session{bp.sessions.length !== 1 ? 's' : ''}
                  {bestScore !== null ? ` · best ${bestScore}%` : ''}
                  {' · '}{bp.difficulty}
                </div>
              </div>
              <Sparkline sessions={bp.sessions} />
            </div>

            {/* Expanded content */}
            {isExpanded && (
              <div style={{
                background: '#141414',
                border: `1px solid ${borderColor}`,
                borderTop: 'none',
                borderBottomLeftRadius: 8,
                borderBottomRightRadius: 8,
                padding: 14,
              }}>
                <ExpandedGraph sessions={bp.sessions} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds. No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ProgressTab.tsx
git commit -m "feat: add ProgressTab component with sparklines and expandable graphs"
```

---

## Task 7: Wire everything into BeatFirstGame

**Files:**
- Modify: `src/components/BeatFirstGame.tsx`

- [ ] **Step 1: Add import for ProgressTab**

At the top of `BeatFirstGame.tsx`, add:
```ts
import ProgressTab from '@/components/ProgressTab'
```

- [ ] **Step 2: Add new state variables**

Inside the component, after the existing `useState` declarations, add:
```ts
const [activeTab, setActiveTab]           = useState<'play' | 'progress'>('play')
const [showMasteryBanner, setShowMasteryBanner] = useState(false)
const [masteredBeatName, setMasteredBeatName]   = useState('')
```

- [ ] **Step 3: Modify `endGame()` to save session**

At the end of `endGame()`, after `if (!user) setShowSignIn(true)`, add:
```ts
// Save session and check mastery
if (user) {
  const perfect = tapResults.filter(r => r.rating === 'perfect').length
  const good    = tapResults.filter(r => r.rating === 'good').length
  const ok      = tapResults.filter(r => r.rating === 'ok').length
  const miss    = tapResults.filter(r => r.rating === 'miss').length

  fetch('/api/game/save-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ beat_id: beat.id, score_pct: pct, perfect, good, ok, miss }),
  })
    .then(res => res.json())
    .then(data => {
      if (data.mastered) {
        setMasteredBeatName(beat.name)
        setShowMasteryBanner(true)
      }
    })
    .catch(() => {
      if (process.env.NODE_ENV === 'development') console.error('save-session failed')
    })
}
```

- [ ] **Step 4: Add tab switcher to JSX**

In the render, immediately after `<p className="mb-8" ...>Tap in time...</p>`, add:
```tsx
{/* ── Tabs ── */}
<div className="flex gap-2 mb-6">
  {(['play', 'progress'] as const).map(tab => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
      style={{
        backgroundColor: activeTab === tab ? 'var(--accent-primary)' : '#1a1a1a',
        color: activeTab === tab ? '#fff' : 'var(--muted)',
      }}
    >
      {tab === 'play' ? 'Play' : 'My Progress'}
    </button>
  ))}
</div>
```

- [ ] **Step 5: Wrap existing play content and add ProgressTab**

Wrap all existing phase-conditional JSX (beat select, countdown, playing, results sections) in:
```tsx
{activeTab === 'play' && (
  <>
    {/* ...all existing phase-based JSX... */}
  </>
)}

{activeTab === 'progress' && (
  <ProgressTab user={user} />
)}
```

- [ ] **Step 6: Add mastery celebration banner**

At the very top of the JSX return (inside `<main>`, before anything else), add:
```tsx
{/* Mastery celebration banner */}
{showMasteryBanner && (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 50,
    background: 'rgba(0,0,0,0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16,
  }}>
    <div style={{
      background: '#111',
      border: '1px solid #22c55e',
      borderRadius: 16,
      padding: '32px 40px',
      maxWidth: 380,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 48, marginBottom: 8, color: '#22c55e' }}>★</div>
      <h2 className="text-2xl font-bold mb-2" style={{ color: '#22c55e' }}>
        You&apos;ve mastered
      </h2>
      <p className="text-xl mb-6" style={{ color: '#F9F9F9' }}>{masteredBeatName}!</p>
      <button
        onClick={() => setShowMasteryBanner(false)}
        className="px-6 py-2 rounded-full font-medium text-white"
        style={{ backgroundColor: '#22c55e' }}
      >
        Keep going →
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 7: Verify build**

```bash
npm run build
```

Expected: Build succeeds. No type errors.

- [ ] **Step 8: Full smoke test (manual)**

```bash
npm run dev
```

Run through this checklist:
1. Sign in with Google
2. Play Hip-Hop Basic — verify POST to save-session succeeds (DevTools Network)
3. Switch to "My Progress" tab — verify beat row appears with session count
4. Click beat row — verify it expands showing graph
5. Sign out — verify "My Progress" tab shows sign-in prompt
6. Sign back in — play Hip-Hop Basic twice more with ≥90% score (3 total) — verify mastery celebration banner appears
7. Dismiss banner — verify results screen is still visible underneath
8. Check Supabase `beat_masteries` table — verify one row for your email + `hiphop-basic`
9. Play Hip-Hop Basic again — verify mastered banner does NOT appear again (permanent mastery)
10. Switch to "My Progress" — verify Hip-Hop Basic shows "★ MASTERED" row

- [ ] **Step 9: Commit**

```bash
git add src/components/BeatFirstGame.tsx
git commit -m "feat: wire ProgressTab into BeatFirstGame with tab switcher and mastery banner"
```

---

## Task 8: Final verification

- [ ] **Step 1: Production build**

```bash
npm run build
```

Expected: Successful build, no errors.

- [ ] **Step 2: Lint**

```bash
npm run lint
```

Expected: No errors.

- [ ] **Step 3: Verify all commits present**

```bash
git log --oneline -8
```

Expected: 7 feature commits visible (chore: server-only, refactor: beats, feat: supabase-admin, feat: auth callbacks, feat: save-session, feat: sessions GET, feat: ProgressTab, feat: BeatFirstGame wiring).
