import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { referralCode } = await req.json()
  if (!referralCode || typeof referralCode !== 'string') {
    return NextResponse.json({ error: 'Missing referral code' }, { status: 400 })
  }

  const newUserEmail = session.user.email

  // Find the referral row
  const { data: referral } = await supabaseAdmin
    .from('referrals')
    .select('id, referrer_email, referred_user_email')
    .eq('referral_code', referralCode)
    .maybeSingle()

  if (!referral) {
    return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 })
  }

  // Don't let referrer claim their own code
  if (referral.referrer_email.toLowerCase() === newUserEmail.toLowerCase()) {
    return NextResponse.json({ claimed: false, reason: 'own_code' })
  }

  // Already claimed — idempotent, just return ok
  if (referral.referred_user_email) {
    return NextResponse.json({ claimed: false, reason: 'already_claimed' })
  }

  await supabaseAdmin
    .from('referrals')
    .update({ referred_user_email: newUserEmail })
    .eq('id', referral.id)

  return NextResponse.json({ claimed: true })
}
