const endpoint = '/api/beatfirst-preview/progress'

/** The deadline includes reading JSON, since response headers can arrive before a stalled body. */
export async function progressRequest(options: RequestInit, fetcher: typeof fetch = fetch, timeoutMs = 12_000) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetcher(endpoint, { ...options, signal: controller.signal })
    const data = await response.json()
    return { ok: response.ok, status: response.status, data }
  } catch { throw new Error('Saving is taking too long or the connection dropped. Your rounds are waiting on this device. Please retry.') }
  finally { clearTimeout(timeout) }
}
