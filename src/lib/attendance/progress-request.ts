const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export class ProgressRequestError extends Error {
  constructor(message: string, public status = 400) { super(message) }
}

export async function parseProgressRequest(request: Request) {
  const url = new URL(request.url)
  if (!['GET', 'POST'].includes(request.method)) throw new ProgressRequestError('Unsupported method.', 405)
  if (request.method === 'POST' && request.headers.get('origin') !== url.origin) throw new ProgressRequestError('Request origin is not allowed.', 403)
  let input: Record<string, unknown>
  if (request.method === 'GET') input = Object.fromEntries(url.searchParams)
  else {
    const raw = await request.text()
    if (raw.length > 12000) throw new ProgressRequestError('Request is too large.', 413)
    try { input = JSON.parse(raw) } catch { throw new ProgressRequestError('Invalid request.') }
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ProgressRequestError('Invalid request.')
  const action = input.action || 'list'
  const allowed = request.method === 'GET' ? ['list', 'workspace'] : ['save', 'configure']
  if (typeof action !== 'string' || !allowed.includes(action)) throw new ProgressRequestError('Unknown progress action.')
  const body: Record<string, unknown> = {}
  if (input.classId !== undefined || action !== 'list') {
    if (typeof input.classId !== 'string' || !UUID.test(input.classId)) throw new ProgressRequestError('Choose a valid class.')
    body.classId = input.classId
  }
  if (action === 'configure') {
    if (!['none', 'archery', 'weight_training'].includes(String(input.tool))) throw new ProgressRequestError('Choose a valid progress tool.')
    body.tool = input.tool
  }
  if (action === 'save') {
    if (typeof input.entryId !== 'string' || !UUID.test(input.entryId)) throw new ProgressRequestError('A valid entry ID is required.')
    if (typeof input.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new ProgressRequestError('Choose a valid date.')
    body.entryId = input.entryId; body.date = input.date
    for (const [key, max] of [['activity', 160], ['result', 1000], ['notes', 2000]] as const) {
      const value = input[key] ?? (key === 'notes' ? '' : undefined)
      if (typeof value !== 'string' || value.trim().length > max || (key !== 'notes' && !value.trim())) throw new ProgressRequestError(`Enter ${key} within ${max} characters.`)
      body[key] = value.trim()
    }
  }
  return { action, body }
}
