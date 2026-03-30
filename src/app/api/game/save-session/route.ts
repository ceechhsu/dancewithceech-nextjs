import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { BEATS } from '@/lib/beats'
import { NextResponse } from 'next/server'

const validBeatIds = new Set(BEATS.map(b => b.id))

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { beat_id, score_pct, perfect, good, ok, miss } = body

  // Validate beat_id
  if (!validBeatIds.has(beat_id)) {
    return NextResponse.json({ error: 'Invalid beat_id' }, { status: 400 })
  }

  // Validate score_pct
  if (!Number.isInteger(score_pct) || score_pct < 0 || score_pct > 100) {
    return NextResponse.json({ error: 'Invalid score_pct' }, { status: 400 })
  }

  // Validate count fields
  for (const [field, val] of Object.entries({ perfect, good, ok, miss })) {
    if (!Number.isInteger(val) || val < 0) {
      return NextResponse.json({ error: `Invalid ${field}` }, { status: 400 })
    }
  }

  const user_email = session.user.email

  // Insert session row
  const { error: insertError } = await supabaseAdmin
    .from('game_sessions')
    .insert({ user_email, beat_id, score_pct, perfect, good, ok, miss })

  if (insertError) {
    return NextResponse.json({ error: 'Failed to save session' }, { status: 500 })
  }

  // Mastery check — insert must complete first so the new row is included
  const alreadyMastered = await supabaseAdmin
    .from('beat_masteries')
    .select('beat_id')
    .eq('user_email', user_email)
    .eq('beat_id', beat_id)
    .maybeSingle()

  if (alreadyMastered.data) {
    return NextResponse.json({ saved: true, mastered: false })
  }

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
