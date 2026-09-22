export function recoveryDestination(value: string | undefined, origin: string): string {
  if (!value || /[\\\r\n]/.test(value)) return '/dashboard'
  try {
    const target = new URL(value, origin)
    if (target.origin !== new URL(origin).origin || target.pathname.startsWith('/api/') || target.pathname.startsWith('/auth/')) return '/dashboard'
    return target.pathname + target.search
  } catch { return '/dashboard' }
}
