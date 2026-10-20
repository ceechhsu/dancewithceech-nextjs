'use client'

import { signIn } from 'next-auth/react'

export default function SignInButton() {
  return (
    <span className="inline-flex items-center gap-2"><a href="/privacy" className="text-xs text-muted underline">Sign-in data</a><button
      type="button"
      onClick={() => signIn('google')}
      className="hover:text-white transition-colors"
    >
      Sign In
    </button></span>
  )
}
