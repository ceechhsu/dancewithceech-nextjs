export type ArcheryClass = { id: string; name: string }
type Identity = { email?: string | null; googleSub?: string; googleEmailVerified?: boolean } | null | undefined
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value) }
function classLinks(value: unknown): ArcheryClass[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  return value.flatMap(item => {
    if (!record(item) || typeof item.id !== 'string' || !uuid.test(item.id) || typeof item.name !== 'string' || seen.has(item.id)) return []
    seen.add(item.id)
    return [{ id: item.id, name: item.name }]
  })
}
// This projection accepts only the list returned by the trusted membership RPC.
export function archeryClasses(data: unknown): ArcheryClass[] {
  if (!record(data) || !Array.isArray(data.classes)) return []
  return classLinks(data.classes.filter(item => record(item) && item.progress_tool === 'archery'))
}
function identityKey(identity: Identity) {
  return identity?.email && identity.googleSub && identity.googleEmailVerified === true ? `${identity.email.trim().toLowerCase()}|${identity.googleSub}` : null
}
export function createArcheryNavigation({ session, load, publish }: {
  session: () => Promise<Identity>;
  load: (signal: AbortSignal) => Promise<unknown>;
  publish: (href: string | null) => void;
}) {
  let generation = 0
  let abort: AbortController | undefined
  let disposed = false
  function invalidate() {
    generation++
    abort?.abort()
    if (!disposed) publish(null)
  }
  return {
    invalidate,
    dispose() { invalidate(); disposed = true },
    async refresh() {
      if (disposed) return
      invalidate()
      const request = generation
      abort = new AbortController()
      const signal = abort.signal
      const current = () => !disposed && generation === request && !signal.aborted
      try {
        const before = await session()
        const key = identityKey(before)
        if (!current() || !key) return
        const data = await load(signal)
        if (!current() || !record(data) || data.account !== before!.email!.trim().toLowerCase()) return
        // Confirm the session again: a cookie/account change may precede its UI notification.
        const after = await session()
        if (!current() || identityKey(after) !== key) return
        const classes = classLinks(data.classes)
        publish(classes.length === 1 ? `/attendance/archery/${classes[0].id}` : classes.length > 1 ? '/attendance/archery' : null)
      } catch { if (current()) publish(null) }
    },
  }
}
