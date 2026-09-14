import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { rosterGoogleProfile } from './lib/attendance/google-profile'
import { syncRosterProfile } from './lib/attendance/profile-sync'

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    jwt({ token, profile }) {
      if (profile?.email) token.email = profile.email
      if (profile) {
        token.googleSub = profile.sub
        token.googleEmailVerified = profile.email_verified === true
        const fields = rosterGoogleProfile(profile)
        token.googleGivenName = fields?.first_name ?? null
        token.googleFamilyName = fields?.last_name ?? null
        token.googleProfileReady = !!fields
        token.picture = fields?.photo_url ?? null
      }
      return token
    },
    session({ session, token }) {
      if (token.email) session.user.email = token.email as string
      Object.assign(session.user, { googleSub: token.googleSub, googleEmailVerified: token.googleEmailVerified === true, googleGivenName: token.googleGivenName, googleFamilyName: token.googleFamilyName, googleProfileReady: token.googleProfileReady === true })
      return session
    },
  },
  events: {
    async signIn({ profile }) {
      const fields = rosterGoogleProfile(profile)
      if (!fields || process.env.ATTENDANCE_ENABLED !== 'true') return
      const url = process.env.ATTENDANCE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.ATTENDANCE_SUPABASE_URL ? process.env.ATTENDANCE_SUPABASE_SERVICE_ROLE_KEY : process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!url || !key) return
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const db = createClient(url, key, { auth: { persistSession: false } })
        await syncRosterProfile(db, fields)
      } catch { console.error('Attendance Google profile could not be refreshed') }
    },
  },
})
