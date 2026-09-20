import { auth } from '@/auth'
import { createLeaderboardHandlers } from '@/lib/beatfirst-leaderboard-service'
import { getLeaderboardStore } from '@/lib/beatfirst-leaderboard-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const handlers = createLeaderboardHandlers({ getSession: () => auth(), getStore: getLeaderboardStore })

export const GET = handlers.GET
export const POST = handlers.POST
