import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user_email = session.user.email

  const [sessionsResult, masteriesResult] = await Promise.all([
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

  if (sessionsResult.error || masteriesResult.error) {
    return NextResponse.json({ error: 'Failed to load sessions' }, { status: 500 })
  }

  return NextResponse.json({
    sessions: sessionsResult.data,
    masteries: masteriesResult.data,
  })
}
