import { auth } from '@/auth'
import { createProgressHandlers } from '@/lib/beatfirst-progress-service'
import { getProgressStore } from '@/lib/beatfirst-progress-store'
import { progressApiEnabled } from '@/components/beatfirst-preview/routes'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const handlers = createProgressHandlers({
  getSession: () => auth(),
  getStore: getProgressStore,
  isEnabled: () => progressApiEnabled(false, process.env.VERCEL_ENV),
})

export const GET = handlers.GET
export const POST = handlers.POST
