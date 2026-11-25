import 'server-only'
import { auth } from '@/auth'
import { beatFirstAccountsEnabled, beatFirstEngagementEnabled } from './beatfirst-engagement-config'
import { createProgressHandlers } from './beatfirst-progress-service'
import { getProgressStore } from './beatfirst-progress-store'

export const liveProgressHandlers = createProgressHandlers({
  getSession: () => auth(),
  getStore: getProgressStore,
  isEnabled: beatFirstAccountsEnabled,
  rewardsEnabled: beatFirstEngagementEnabled,
})
