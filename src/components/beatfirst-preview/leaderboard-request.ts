class LeaderboardResponseError extends Error {}

/** Abort both the connection and response body when changing levels or accounts. */
export async function leaderboardRequest<T>(endpoint: string, options: RequestInit, fetcher: typeof fetch = fetch, timeoutMs = 10_000): Promise<T> {
  const controller = new AbortController()
  const cancel = () => controller.abort()
  const timeout = setTimeout(cancel, timeoutMs)
  options.signal?.addEventListener('abort', cancel, { once: true })
  try {
    if (options.signal?.aborted) throw new Error('Cancelled')
    const response = await fetcher(endpoint, { ...options, cache: 'no-store', signal: controller.signal })
    const data = await response.json()
    if (!response.ok) throw new LeaderboardResponseError(typeof data?.error === 'string' ? data.error : 'Leaderboard unavailable. Please try again.')
    return data as T
  } catch (error) {
    if (error instanceof LeaderboardResponseError) throw error
    throw new Error('Leaderboard unavailable. Check your connection and try again.')
  } finally {
    clearTimeout(timeout)
    options.signal?.removeEventListener('abort', cancel)
  }
}
