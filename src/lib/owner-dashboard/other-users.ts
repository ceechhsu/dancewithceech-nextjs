import type { Overview } from './model'

export type RosterIdentity = { google_sub: string | null; email: string | null }
const emailKey = (value: string | null) => value?.trim().toLowerCase() || null
const accountKey = (value: string | null) => {
  const sub = value?.trim().replace(/^google:/, '')
  return sub && /^[a-zA-Z0-9_-]{1,255}$/.test(sub) ? `google:${sub}` : null
}

/** Only exact linked subjects or exact normalized emails establish a roster match. */
export function otherUsersOverview(overview: Overview, memberships: RosterIdentity[]): Overview {
  const subjects = new Set(memberships.map(row => accountKey(row.google_sub)).filter(Boolean))
  const emails = new Set(memberships.map(row => emailKey(row.email)).filter(Boolean))
  const accounts = overview.accounts.filter(account => !subjects.has(account.id) && !emails.has(emailKey(account.email)))
  const ids = new Set(accounts.map(account => account.id))
  return { ...overview, accounts, activity: overview.activity.filter(event => ids.has(event.user_id)) }
}

export async function loadOtherUsers(deps: {
  authorize: () => Promise<void>;
  overview: () => Promise<Overview>;
  memberships: () => Promise<RosterIdentity[]>;
}): Promise<Overview> {
  await deps.authorize()
  const memberships = await deps.memberships()
  return otherUsersOverview(await deps.overview(), memberships)
}
