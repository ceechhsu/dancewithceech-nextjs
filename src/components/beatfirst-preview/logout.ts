async function clearAttendanceData(owner: string) {
  if (typeof indexedDB === 'undefined') return
  const { clearOfflineData } = await import('@/lib/attendance/offline')
  await clearOfflineData(owner)
}

export async function signOutAfterAttendanceCleanup(
  email: string | null | undefined,
  signOut: () => Promise<unknown>,
  clearOfflineData: (owner: string) => Promise<void> = clearAttendanceData,
) {
  if (email) {
    try { await clearOfflineData(email.trim().toLowerCase()) }
    catch { throw new Error('Sync or discard pending attendance changes before signing out. If they are already synced, allow website storage and retry.') }
  }
  await signOut()
}
