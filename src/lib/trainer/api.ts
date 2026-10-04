import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import sharp from 'sharp'
import catalog from '@/content/trainer-lessons.json'
import { cleanName, emailAddress, googlePhoto, readBody, SCORING, timingResult, TrainerError, type Input, type TrainerIdentity } from './validation'
export type { TrainerIdentity } from './validation'

type Lesson = { id: string; title: string; version: number; reference_hash: string; poster_url?: string; practice_ready?: boolean }
type Challenge = { id: string; sender: string; name: string; take: string; lesson: string; version: number; reference_hash: string; scoring: string; score: number; measured: number; created: number; expires: number }
type Profile = { first_name: string; last_name: string; display_name: string; photo_mode: string; photo: string | null; updated: number }
const lessons = catalog.lessons as Lesson[]
const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }
const json = (value: unknown, status = 200) => Response.json(value, { status, headers })
const now = () => Date.now() / 1000
// Vercel previews must never write launch profiles, scores, or reward history.
function storage(name: string) { return process.env.VERCEL_ENV === 'preview' ? name.replace(/^trainer_/, 'trainer_preview_') : name }
function db(): SupabaseClient {
  const url = process.env.TRAINER_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.TRAINER_SUPABASE_SECRET_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new TrainerError('Account storage is not available yet. Your recording is still on this device.', 503)
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
}
async function checked<T>(query: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await query
  if (error) throw new TrainerError('Your changes could not be saved. Please retry; your recording is still on this device.', 503)
  return data
}
function lesson(id: unknown): Lesson {
  const item = lessons.find(x => x.id === id && ['marching', '2step'].includes(x.id) && x.practice_ready !== false)
  if (!item) throw new TrainerError('This drill is not available for challenges.', 410)
  return item
}
function revision(data: Input | Challenge) {
  const item = lesson(data.lesson)
  if (data.version !== item.version || data.reference_hash !== item.reference_hash || (data.scoring ?? SCORING) !== SCORING) throw new TrainerError('This reference has changed. Start a new comparison from the library.', 409)
  return item
}
function usable(c: Challenge) { if (c.expires <= now()) throw new TrainerError('This challenge has expired. Ask your friend for a new one.', 410); return revision(c) }
function requireIdentity(identity: TrainerIdentity | null): TrainerIdentity {
  if (!identity?.account.startsWith('google:') || identity.account.length <= 7) throw new TrainerError('Sign in with Google to continue.', 401)
  return identity
}
async function profileRow(client: SupabaseClient, who: TrainerIdentity): Promise<Profile> {
  const row = await checked(client.from(storage('trainer_profiles')).select('*').eq('account', who.account).maybeSingle())
  const display = who.name.trim().replace(/\s+/g, ' ').slice(0, 40)
  return row ?? { first_name: who.firstName.slice(0, 80), last_name: who.lastName.slice(0, 80), display_name: display && !display.includes('@') ? display : 'Dancer', photo_mode: 'google', photo: null, updated: 0 }
}
function publicProfile(row: Profile, who: TrainerIdentity) {
  return { first_name: row.first_name, last_name: row.last_name, display_name: row.display_name, photo_mode: row.photo_mode, photo_url: row.photo_mode === 'custom' && row.photo ? `/practice/api/profile/photo?v=${row.updated}` : row.photo_mode === 'google' ? googlePhoto(who.photo) : '', google_photo_url: googlePhoto(who.photo), email: who.email }
}
export async function readTrainerProfile(who: TrainerIdentity) { return publicProfile(await profileRow(db(), who), who) }
async function rewards(client: SupabaseClient, account: string): Promise<{ points: number; rewards: { lesson: string; points: number; completed: number }[] }> {
  return checked(client.rpc(storage('trainer_rewards'), { actor: account }))
}
async function profile(request: Request, client: SupabaseClient, who: TrainerIdentity, photo: boolean) {
  let row = await profileRow(client, who)
  if (photo) {
    if (!['GET', 'HEAD'].includes(request.method)) throw new TrainerError('Method not allowed.', 405)
    if (!row.photo) throw new TrainerError('No uploaded photo.', 404)
    const bytes = Buffer.from(row.photo, 'base64')
    return new Response(request.method === 'HEAD' ? null : bytes, { headers: { ...headers, 'Content-Type': 'image/jpeg', 'Content-Length': String(bytes.length) } })
  }
  if (request.method === 'POST') {
    const data = await readBody(request, 410000)
    if (Object.keys(data).some(k => !['first_name', 'last_name', 'display_name', 'photo_mode', 'photo_data'].includes(k))) throw new TrainerError('Only profile names and photo can be changed.')
    const first_name = cleanName(data.first_name ?? ''), last_name = cleanName(data.last_name ?? ''), display_name = cleanName(data.display_name, true)
    const mode = data.photo_mode ?? row.photo_mode
    if (!['google', 'custom', 'none'].includes(mode as string)) throw new TrainerError('Choose a valid photo option.')
    let photoData = row.photo
    if (data.photo_data) {
      if (typeof data.photo_data !== 'string' || data.photo_data.length > 400000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(data.photo_data)) throw new TrainerError('Choose a photo using the photo picker.')
      try {
        const bytes = Buffer.from(data.photo_data.split(',')[1], 'base64')
        const metadata = await sharp(bytes, { limitInputPixels: 1024 * 1024 }).metadata()
        if (metadata.format !== 'jpeg' || !metadata.width || !metadata.height || metadata.width > 1024 || metadata.height > 1024) throw new Error()
        photoData = (await sharp(bytes, { limitInputPixels: 1024 * 1024 }).rotate().resize(384, 384, { fit: 'cover' }).jpeg({ quality: 85 }).toBuffer()).toString('base64')
      } catch { throw new TrainerError('This photo could not be read. Try a different photo.') }
    }
    if (mode === 'custom' && !photoData) throw new TrainerError('Choose a photo first.')
    row = { first_name, last_name, display_name, photo_mode: mode as string, photo: mode === 'custom' ? photoData : null, updated: now() }
    await checked(client.from(storage('trainer_profiles')).upsert({ ...row, account: who.account }))
  } else if (!['GET', 'HEAD'].includes(request.method)) throw new TrainerError('Method not allowed.', 405)
  return json({ ...publicProfile(row, who), ...await rewards(client, who.account) })
}
async function scores(request: Request, client: SupabaseClient, who: TrainerIdentity) {
  if (request.method === 'POST') {
    const data = await readBody(request, 4096)
    if (!['marching', '2step'].includes(data.lesson as string)) throw new TrainerError('This score could not be saved.', 400)
    const result = timingResult(data, false)
    await checked(client.from(storage('trainer_scores')).upsert({ account: who.account, take: data.take, lesson: data.lesson, ...result, saved: now() }, { onConflict: 'account,take' }))
    return json({ saved: true, score: result.score })
  }
  if (!['GET', 'HEAD'].includes(request.method)) throw new TrainerError('Method not allowed.', 405)
  return json({ scores: await checked(client.from(storage('trainer_scores')).select('lesson,score,measured,onbeat,saved').eq('account', who.account).order('saved', { ascending: false }).limit(50)) })
}
async function load(client: SupabaseClient, id: string): Promise<Challenge> {
  const value = await checked(client.from(storage('trainer_challenges')).select('*').eq('id', id).maybeSingle())
  if (!value) throw new TrainerError('This challenge could not be found.', 404)
  return value
}
async function mutate(client: SupabaseClient, action: string, who: TrainerIdentity, payload: Input): Promise<{ id: string; existing?: boolean; error?: string; status?: number; reservation?: string; payload?: unknown }> { // RPC JSON is checked before use.
  const out = await checked(client.rpc(storage('trainer_mutate'), { action, actor: who.account, payload }))
  if (out.error) throw new TrainerError(out.error, out.status)
  return out
}
async function detail(client: SupabaseClient, c: Challenge, who: TrainerIdentity | null) {
  const item = lessons.find(x => x.id === c.lesson)
  let available = true, reason: string | null = null
  try { usable(c) } catch (error) { available = false; reason = (error as Error).message }
  const [entry, done, results] = await Promise.all([
    who ? checked(client.from(storage('trainer_challenge_entries')).select('accepted').eq('challenge', c.id).eq('recipient', who.account).maybeSingle()) : null,
    who ? checked(client.from(storage('trainer_challenge_completions')).select('score,measured,points').eq('challenge', c.id).eq('recipient', who.account).maybeSingle()) : null,
    who?.account === c.sender ? checked(client.from(storage('trainer_challenge_completions')).select(process.env.VERCEL_ENV === 'preview' ? 'score,measured,points,trainer_challenge_entries:trainer_preview_challenge_entries(name)' : 'score,measured,points,trainer_challenge_entries(name)').eq('challenge', c.id).order('completed', { ascending: false }).limit(30)) : [],
  ])
  return { server_time: now(), results: (results ?? []).map(x => ({ score: x.score, measured: x.measured, points: x.points, name: (x.trainer_challenge_entries as unknown as { name: string }).name })), id: c.id, name: c.name, lesson: c.lesson, title: item?.title ?? c.lesson, score: c.score, measured: c.measured, expires: c.expires, version: c.version, reference_hash: c.reference_hash, available, reason, is_sender: who?.account === c.sender, accepted: !!entry, completed: done, poster: item?.poster_url || '/practice/marching-library.jpg', test_only: true }
}
async function dashboard(client: SupabaseClient, who: TrainerIdentity) {
  const [owned, entries, balance] = await Promise.all([
    checked(client.from(storage('trainer_challenges')).select('*').eq('sender', who.account).order('created', { ascending: false }).limit(30)),
    checked(client.from(storage('trainer_challenge_entries')).select(process.env.VERCEL_ENV === 'preview' ? 'accepted,trainer_challenges:trainer_preview_challenges(*)' : 'accepted,trainer_challenges(*)').eq('recipient', who.account).order('accepted', { ascending: false }).limit(30)),
    rewards(client, who.account),
  ])
  const list = [...(owned ?? []).map(c => ({ c: c as Challenge, at: c.created })), ...(entries ?? []).map(e => ({ c: e.trainer_challenges as unknown as Challenge, at: e.accepted }))].sort((a, b) => b.at - a.at).slice(0, 30)
  const challenges = await Promise.all(list.map(async ({ c }) => {
    const out = await detail(client, c, who)
    if (c.sender !== who.account) return out
    const [done, accepted] = await Promise.all([client.from(storage('trainer_challenge_completions')).select('*', { count: 'exact', head: true }).eq('challenge', c.id), client.from(storage('trainer_challenge_entries')).select('*', { count: 'exact', head: true }).eq('challenge', c.id)])
    if (done.error || accepted.error) throw new TrainerError('Your challenge list could not be loaded. Please retry.', 503)
    return { ...out, finishes: done.count, accepted_count: accepted.count }
  }))
  return json({ balance: balance.points, challenges, test_only: true })
}
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!)) }
async function invite(client: SupabaseClient, c: Challenge, who: TrainerIdentity, data: Input) {
  if (c.sender !== who.account) throw new TrainerError('Only the person who created this challenge can email it.', 403)
  const item = usable(c), recipient = emailAddress(data.email)
  if (recipient === who.email.toLowerCase()) throw new TrainerError('Enter your friend’s email instead of your own.')
  const key = process.env.RESEND_API_KEY, origin = process.env.TRAINER_PUBLIC_ORIGIN
  if (process.env.TRAINER_EMAIL_ENABLED !== 'true' || !key || !origin) throw new TrainerError('Email invitations are not available yet. Use Share challenge or Copy link.', 503)
  let parsed: URL
  try { parsed = new URL(origin) } catch { throw new TrainerError('Email invitations are not available yet. Use Copy link.', 503) }
  if (parsed.protocol !== 'https:' || parsed.origin !== origin || parsed.username || parsed.password) throw new TrainerError('Email invitations are not available yet. Use Copy link.', 503)
  const url = `${origin}/practice/challenge.html?id=${c.id}`
  const text = `${c.name} challenged you to ${item.title} on Dance With Ceech.\n\nTheir timing score: ${c.score}/100 (${c.measured}/16 estimated steps).\n\nAccept the challenge: ${url}\n\nSign in with Google and record a new take. Your video stays on your phone. Both players earn test points for completing the challenge; these points do not unlock paid content.\n\nThis link expires after 30 days or when the drill changes. Anyone with the link can join.\n\nSent at your friend’s request. You have not been subscribed to a mailing list. If you did not expect this invitation, you can ignore it.`
  const message = { from: 'Dance With Ceech <noreply@dancewithceech.com>', to: [recipient], subject: `${c.name} challenged you to ${item.title}`, text, html: `<div style="font-family:Arial,sans-serif;line-height:1.6">${escapeHtml(text).replace(/\n/g, '<br>')}<p><a href="${escapeHtml(url)}">Accept challenge</a></p></div>` }
  const reservation = await mutate(client, 'email_reserve', who, { id: c.id, current_version: item.version, current_reference_hash: item.reference_hash, recipient_hash: createHash('sha256').update(recipient).digest('hex'), reservation: randomBytes(16).toString('hex'), message })
  if (!reservation.reservation) return json(reservation, reservation.status ?? 200)
  try {
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': `dance-challenge-${reservation.reservation}` }, body: JSON.stringify(reservation.payload), signal: AbortSignal.timeout(12000) })
    const result = await response.json()
    if (!response.ok || typeof result.id !== 'string') throw new Error('No receipt')
    await checked(client.from(storage('trainer_email_invites')).update({ state: 'sent', payload: null, receipt: result.id, lease_until: 0 }).eq('id', reservation.reservation).eq('sender', who.account))
  } catch {
    await client.from(storage('trainer_email_invites')).update({ lease_until: 0 }).eq('id', reservation.reservation).eq('sender', who.account).eq('state', 'pending')
    throw new TrainerError('Sending could not be confirmed. Retry to check safely, or use Copy link.', 503)
  }
  return json({ sent: true, already_sent: false })
}
async function challenges(request: Request, client: SupabaseClient, path: string, identity: TrainerIdentity | null) {
  const match = /^\/api\/challenges(?:\/([a-f0-9]{32})(?:\/(accept|complete|email))?)?$/.exec(path)
  if (!match) throw new TrainerError('Challenge not found.', 404)
  const [, token, action] = match
  const isRead = ['GET', 'HEAD'].includes(request.method)
  if (!isRead || !token || action) requireIdentity(identity)
  if (isRead) { if (action) throw new TrainerError('Challenge not found.', 404); return token ? json(await detail(client, await load(client, token), identity)) : dashboard(client, identity!) }
  if (request.method !== 'POST') throw new TrainerError('Method not allowed.', 405)
  const who = identity!, data = await readBody(request, 8192)
  if (token && action === 'email') return invite(client, await load(client, token), who, data)
  const p = await profileRow(client, who), name = cleanName(p.display_name === 'Dancer' ? data.name ?? 'Dancer' : p.display_name, true)
  if (!token) {
    const result = timingResult(data); revision(data)
    const out = await mutate(client, 'create', who, { ...data, ...result, id: randomBytes(16).toString('hex'), name, scoring: SCORING })
    const c = await load(client, out.id); usable(c)
    return json(await detail(client, c, who), out.existing ? 200 : 201)
  }
  if (!['accept', 'complete'].includes(action)) throw new TrainerError('Challenge action not found.', 404)
  const c = await load(client, token)
  // Revision and recording checks are also made inside the transaction; completed requests remain idempotent.
  const item = lessons.find(x => x.id === c.lesson && x.practice_ready !== false)
  const out = await mutate(client, action, who, { ...data, id: token, name, current_version: item?.version, current_reference_hash: item?.reference_hash })
  return action === 'complete' ? json(out) : json(await detail(client, c, who))
}
async function manualSync(request: Request, who: TrainerIdentity | null) {
  if (request.method !== 'POST') throw new TrainerError('Method not allowed.', 405)
  const data = await readBody(request, 2048), key = process.env.TRAINER_SYNC_SIGNING_KEY
  if (!key || !/^[a-fA-F0-9]{64,}$/.test(key) || key.length % 2) throw new TrainerError('Manual synchronization is not available yet.', 503)
  if (typeof data.comparison !== 'string' || !/^(?:[a-f0-9]{32}|local-[a-f0-9-]{36})$/.test(data.comparison) || typeof data.offset !== 'number' || !Number.isFinite(data.offset) || Math.abs(data.offset) > 30) throw new TrainerError('Invalid synchronization adjustment.', 400)
  const signature = createHmac('sha256', Buffer.from(key, 'hex')).update(JSON.stringify([data.comparison, data.offset])).digest('hex')
  if (data.action === 'verify') { const supplied = typeof data.signature === 'string' ? data.signature : ''; return json({ verified: /^[a-f0-9]{64}$/.test(supplied) && timingSafeEqual(Buffer.from(supplied), Buffer.from(signature)) }) }
  if (data.action !== 'save') throw new TrainerError('Invalid synchronization action.', 400)
  if (!who?.owner) throw new TrainerError('Only the owner can adjust synchronization.', 403)
  return json({ verified: true, comparison: data.comparison, offset: data.offset, signature })
}
async function debugTransfer(request: Request, who: TrainerIdentity | null) {
  if (!who?.owner || !who.account.startsWith('google:')) throw new TrainerError('Only the owner can send debugging recordings.', 403)
  if (request.method !== 'POST') throw new TrainerError('Method not allowed.', 405)
  const key = process.env.TRAINER_DEBUG_TRANSFER_KEY
  if (!key || !/^[a-fA-F0-9]{64}$/.test(key)) throw new TrainerError('Debugging uploads are not configured here yet.', 503)
  const data = await readBody(request, 2048)
  if (Object.keys(data).some(k => !['length', 'sha256'].includes(k)) || !Number.isInteger(data.length) || (data.length as number) < 13 || (data.length as number) > 90 * 1024 * 1024 + 65540 || typeof data.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(data.sha256)) throw new TrainerError('This recording could not be prepared for debugging.')
  const url = 'https://test.dancewithceech.com/api/owner-debug-transfer'
  const iat = Math.floor(now())
  const claims = {v:1,aud:url,origin:new URL(request.url).origin,sub:who.account,email:who.email.toLowerCase(),id:randomBytes(16).toString('hex'),iat,exp:iat+300,length:data.length,sha256:data.sha256}
  const encoded = Buffer.from(JSON.stringify(claims)).toString('base64url')
  const signature = createHmac('sha256', Buffer.from(key, 'hex')).update(encoded).digest('base64url')
  return json({url,token:encoded+'.'+signature})
}
export async function handleTrainerApi(request: Request, path: string, identity: TrainerIdentity | null): Promise<Response> {
  try {
    if (request.method === 'POST' && request.headers.get('origin') !== new URL(request.url).origin) throw new TrainerError('This request must come from this website.', 403)
    if (path === '/api/debug-transfer') return await debugTransfer(request, identity)
    if (path === '/api/manual-sync') return await manualSync(request, identity)
    if (path === '/api/profile' || path === '/api/profile/photo') { const who = requireIdentity(identity); return await profile(request, db(), who, path.endsWith('/photo')) }
    if (path === '/api/scores') { const who = requireIdentity(identity); return await scores(request, db(), who) }
    if (path.startsWith('/api/challenges')) {
      if (!(['GET', 'HEAD'].includes(request.method) && /^\/api\/challenges\/[a-f0-9]{32}$/.test(path))) requireIdentity(identity)
      return await challenges(request, db(), path, identity)
    }
    return json({ error: 'Not found.' }, 404)
  } catch (error) {
    return json({ error: error instanceof TrainerError ? error.message : 'Account services are temporarily unavailable. Your recording is still on this device.' }, error instanceof TrainerError ? error.status : 503)
  }
}
