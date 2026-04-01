import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  const { referrerEmail, referredEmail } = await req.json()

  if (!EMAIL_RE.test(referrerEmail) || !EMAIL_RE.test(referredEmail)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  if (referrerEmail.toLowerCase() === referredEmail.toLowerCase()) {
    return NextResponse.json({ error: 'Cannot invite yourself' }, { status: 400 })
  }

  const referralCode = crypto.randomUUID()

  const { error } = await supabaseAdmin
    .from('referrals')
    .insert({ referrer_email: referrerEmail, referred_email: referredEmail, referral_code: referralCode })

  if (error) {
    return NextResponse.json({ error: 'Failed to create referral' }, { status: 500 })
  }

  const inviteUrl = `https://dancewithceech.com/beat-first?ref=${referralCode}`

  await resend.emails.send({
    from: 'BeatFirst <noreply@dancewithceech.com>',
    to: referredEmail,
    subject: `${referrerEmail} invited you to try BeatFirst`,
    html: `
      <p>Hey! Your friend <strong>${referrerEmail}</strong> wants you to try <strong>BeatFirst</strong> — a rhythm trainer for dancers.</p>
      <p>Sign up and complete a beat to unlock a bonus beat pattern for them.</p>
      <p><a href="${inviteUrl}" style="background:#2563EB;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Accept Invite &amp; Play</a></p>
      <p style="color:#888;font-size:12px;">dancewithceech.com</p>
    `,
  })

  return NextResponse.json({ success: true })
}
