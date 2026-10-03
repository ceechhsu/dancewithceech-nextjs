export type TrainerIdentity = { account: string; email: string; name: string; firstName: string; lastName: string; photo: string; owner: boolean }
export type Input = Record<string, unknown>
export const SCORING = '67-100-150:100-50-25-0'
export const TAKE = /^local-[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/
export class TrainerError extends Error {
  constructor(message: string, public status = 422) { super(message) }
}
export function timingResult(data: Input, aligned = true) {
  if (typeof data.take !== 'string' || !TAKE.test(data.take)) throw new TrainerError('Save this comparison on your device first.')
  if (aligned && data.aligned !== true) throw new TrainerError('Finish audio alignment before sharing or completing a challenge.')
  if (!Array.isArray(data.deltas) || data.deltas.length !== 16) throw new TrainerError('Finish analyzing all 16 beats first.')
  const values = data.deltas.filter(d => d !== null)
  if (!values.length || values.some(d => typeof d !== 'number' || !Number.isFinite(d) || Math.abs(d) > 300)) throw new TrainerError('This comparison has no usable timing estimates yet.')
  const points = values.map((d: number) => Math.abs(d) <= 67 ? 100 : Math.abs(d) <= 100 ? 50 : Math.abs(d) <= 150 ? 25 : 0)
  return { score: Math.round(points.reduce<number>((a, b) => a + b, 0) / values.length), measured: values.length, onbeat: values.filter(d => Math.abs(d) <= 67).length }
}
export function cleanName(value: unknown, required = false) {
  if (typeof value !== 'string' || [...value].length > 80 || /[\x00-\x1f]/.test(value)) throw new TrainerError('Use a name of 80 characters or fewer.')
  const name = value.trim().replace(/\s+/g, ' ')
  if (required && (!name || [...name].length > 40 || name.includes('@'))) throw new TrainerError('Choose a display name of 1–40 characters, not an email address.')
  return name
}
export function googlePhoto(value: string) {
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && (u.hostname === 'googleusercontent.com' || u.hostname.endsWith('.googleusercontent.com')) ? value : '' } catch { return '' }
}
export function emailAddress(value: unknown) {
  if (typeof value !== 'string') throw new TrainerError('Enter your friend’s email address.')
  const email = value.trim().toLowerCase()
  const [local, domain] = email.split('@')
  if (email.length > 254 || !/^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$/.test(email) || local.length > 64 || local.startsWith('.') || local.endsWith('.') || email.includes('..') || domain.split('.').some(x => !x || x.length > 63 || x.startsWith('-') || x.endsWith('-'))) throw new TrainerError('Enter one valid email address.')
  return email
}
export async function readBody(request: Request, limit: number): Promise<Input> {
  if (Number(request.headers.get('content-length')) > limit) throw new TrainerError('This request is too large.', 413)
  const reader = request.body?.getReader(); const chunks: Uint8Array[] = []; let size = 0
  if (!reader) throw new TrainerError('Invalid request.', 400)
  while (true) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > limit) { await reader.cancel(); throw new TrainerError('This request is too large.', 413) } chunks.push(value) }
  try { const value = JSON.parse(Buffer.concat(chunks).toString()); if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(); return value } catch { throw new TrainerError('Invalid request.', 400) }
}
