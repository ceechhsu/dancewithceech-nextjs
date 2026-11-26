import { auth } from '@/auth'
import { beatFirstAccountsEnabled } from '@/lib/beatfirst-engagement-config'
import { createProgressHandlers } from '@/lib/beatfirst-progress-service'
import { getProgressStore } from '@/lib/beatfirst-progress-store'
import { progressApiEnabled } from '@/components/beatfirst-preview/routes'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const handlers = createProgressHandlers({
  getSession: () => auth(),
  getStore: getProgressStore,
  isEnabled: () => progressApiEnabled(true, process.env.VERCEL_ENV) && beatFirstAccountsEnabled(),
})

export const GET = handlers.GET
export const POST = handlers.POST
