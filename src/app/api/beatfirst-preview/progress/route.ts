import { auth } from '@/auth'
import { createProgressHandlers } from '@/lib/beatfirst-progress-service'
import { getProgressStore } from '@/lib/beatfirst-progress-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const handlers = createProgressHandlers({
  getSession: () => auth(),
  getStore: getProgressStore,
  isEnabled: () => !process.env.VERCEL_ENV || ['development', 'preview'].includes(process.env.VERCEL_ENV),
})

export const GET = handlers.GET
export const POST = handlers.POST
