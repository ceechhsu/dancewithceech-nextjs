"use client";
import { useEffect, useState } from 'react'
import { getSession } from 'next-auth/react'
import { createArcheryNavigation } from '@/lib/attendance/archery-navigation'

export default function useArcheryNavigation(email?: string | null) {
  const [access, setAccess] = useState<{ email: string; href: string } | null>(null)
  const account = email?.trim().toLowerCase() || ''
  useEffect(() => {
    const controller = createArcheryNavigation({
      session: async () => {
        const user = (await getSession({ broadcast: false }))?.user
        return user?.email?.trim().toLowerCase() === account ? user : null
      },
      load: async signal => {
        const response = await fetch('/api/attendance/archery-access', { signal, cache: 'no-store' })
        if (!response.ok) throw new Error('Archery access unavailable')
        return response.json()
      },
      publish: href => setAccess(href && account ? { email: account, href } : null),
    })
    const refresh = () => { void controller.refresh() }
    const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('next-auth')
    channel?.addEventListener('message', refresh)
    window.addEventListener('focus', refresh)
    const visibility = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', visibility)
    if (account) refresh()
    return () => {
      controller.dispose()
      channel?.close()
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [account])
  // Hide a previous account's result during the render before the effect cleans up.
  return access?.email === account ? access.href : null
}
